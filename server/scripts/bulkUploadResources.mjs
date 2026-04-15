import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.env.IMPORT_ROOT_DIR;
const API_BASE = process.env.IMPORT_API_BASE || 'http://localhost:3000';
const AUTH_TOKEN = process.env.IMPORT_AUTH_TOKEN || '';
const CATEGORY = process.env.IMPORT_CATEGORY || '';
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE || 20);
const DRY_RUN = String(process.env.IMPORT_DRY_RUN || '').toLowerCase() === 'true';
const CHECKPOINT_FILE = process.env.IMPORT_CHECKPOINT_FILE || '.import-checkpoint.json';
const RESET_CHECKPOINT = String(process.env.IMPORT_RESET_CHECKPOINT || '').toLowerCase() === 'true';

if (!ROOT_DIR) {
  console.error('Missing IMPORT_ROOT_DIR');
  console.error('Example: IMPORT_ROOT_DIR="E:/my-resources" node scripts/bulkUploadResources.mjs');
  process.exit(1);
}

const normalizePath = (p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const stripExt = (name) => name.replace(/\.[^/.]+$/, '');

const walkFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const groupByCourse = (rootDir, files) => {
  const map = new Map();
  for (const filePath of files) {
    const rel = normalizePath(path.relative(rootDir, filePath));
    const relDir = normalizePath(path.dirname(rel));
    const firstLevel = relDir === '.' ? '' : relDir.split('/')[0];
    const course = firstLevel || '未分类';
    const pathUnderCourse = firstLevel ? rel.slice(firstLevel.length + 1) : rel;
    if (!map.has(course)) map.set(course, []);
    map.get(course).push({
      filePath,
      relativePath: rel,
      pathUnderCourse: pathUnderCourse || path.basename(rel),
    });
  }
  return map;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const loadCheckpoint = async (checkpointPath) => {
  try {
    const raw = await fs.readFile(checkpointPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      uploaded: new Set(Array.isArray(parsed?.uploaded) ? parsed.uploaded : []),
    };
  } catch {
    return { uploaded: new Set() };
  }
};

const saveCheckpoint = async (checkpointPath, uploadedSet) => {
  const payload = {
    uploaded: Array.from(uploadedSet),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(checkpointPath, JSON.stringify(payload, null, 2), 'utf-8');
};

const uploadBatch = async (course, fileEntries) => {
  const form = new FormData();
  form.set('course', course);
  if (CATEGORY) form.set('category', CATEGORY);

  for (const entry of fileEntries) {
    const { filePath, pathUnderCourse } = entry;
    const buf = await fs.readFile(filePath);
    const filename = path.basename(filePath);
    const blob = new Blob([buf]);
    form.append('files', blob, filename);
    form.append('titles', stripExt(filename));
    form.append('paths', normalizePath(pathUnderCourse));
  }

  const headers = {};
  if (AUTH_TOKEN) headers.Authorization = `Bearer ${AUTH_TOKEN}`;

  const res = await fetch(`${API_BASE}/api/resources/upload`, {
    method: 'POST',
    headers,
    body: form,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : { message: await res.text() };

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
};

const main = async () => {
  const root = path.resolve(ROOT_DIR);
  const isDirectory = await fs.stat(root).then((s) => s.isDirectory()).catch(() => false);
  if (!isDirectory) {
    throw new Error(`Directory not found: ${root}`);
  }

  const checkpointPath = path.resolve(CHECKPOINT_FILE);
  if (RESET_CHECKPOINT) {
    await fs.rm(checkpointPath, { force: true });
    console.log(`Checkpoint reset: ${checkpointPath}`);
  }
  const checkpoint = await loadCheckpoint(checkpointPath);

  const files = await walkFiles(root);
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  const pendingFiles = files.filter((filePath) => {
    const rel = normalizePath(path.relative(root, filePath));
    return !checkpoint.uploaded.has(rel);
  });
  const skipped = files.length - pendingFiles.length;
  if (pendingFiles.length === 0) {
    console.log(`All files already uploaded. (checkpoint: ${checkpointPath})`);
    return;
  }

  const grouped = groupByCourse(root, pendingFiles);
  console.log(`Found ${files.length} files, pending ${pendingFiles.length}, skipped ${skipped}.`);
  console.log(`Checkpoint file: ${checkpointPath}`);
  console.log(`Pending files are grouped into ${grouped.size} course bucket(s).`);

  let uploaded = 0;
  for (const [course, courseEntries] of grouped) {
    const batches = chunk(courseEntries, Math.max(1, Math.min(BATCH_SIZE, 30)));
    for (const batch of batches) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] course=${course} files=${batch.length}`);
        uploaded += batch.length;
        continue;
      }
      const result = await uploadBatch(course, batch);
      const count = Array.isArray(result?.items) ? result.items.length : batch.length;
      uploaded += count;
      for (const entry of batch) {
        checkpoint.uploaded.add(entry.relativePath);
      }
      await saveCheckpoint(checkpointPath, checkpoint.uploaded);
      console.log(`Uploaded ${count} file(s) -> course=${course}`);
    }
  }

  console.log(`Done. Uploaded ${uploaded} file(s).`);
};

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
