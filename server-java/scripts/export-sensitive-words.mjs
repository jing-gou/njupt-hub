#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const resources = path.resolve(process.cwd(), 'src/main/resources');

const words = new Set();
const wordSourceDir = path.join(repoRoot, 'server/node_modules/sensitive-word-tool/src/words');
for (const name of ['ads', 'politics', 'violence', 'porn']) {
  const source = fs.readFileSync(path.join(wordSourceDir, `${name}.ts`), 'utf8');
  for (const match of source.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)) {
    words.add(match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
}

// The Node filter also adds a small hard-coded fallback list on top of the library.
const nodeFilterSource = fs.readFileSync(
  path.join(repoRoot, 'server/src/lib/sensitiveFilter.js'),
  'utf8',
);
const fallbackMatch = nodeFilterSource.match(/const BUILTIN_FALLBACK_WORDS = \[([\s\S]*?)\];/);
if (!fallbackMatch) {
  throw new Error('BUILTIN_FALLBACK_WORDS not found in server/src/lib/sensitiveFilter.js');
}
for (const match of fallbackMatch[1].matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)) {
  words.add(match[2]);
}

const wordOutDir = path.join(resources, 'sensitive-words');
fs.mkdirSync(wordOutDir, { recursive: true });
fs.writeFileSync(path.join(wordOutDir, 'builtin.txt'), `${[...words].sort().join('\n')}\n`);

const lexiconSourceDir = path.join(repoRoot, 'server/config/sensitive-lexicon');
const lexiconOutDir = path.join(resources, 'sensitive-lexicon');
fs.mkdirSync(lexiconOutDir, { recursive: true });
const lexiconFiles = fs.readdirSync(lexiconSourceDir)
  .filter((name) => name.endsWith('.txt'))
  .sort();
for (const file of lexiconFiles) {
  fs.copyFileSync(path.join(lexiconSourceDir, file), path.join(lexiconOutDir, file));
}
fs.writeFileSync(path.join(lexiconOutDir, 'index.txt'), `${lexiconFiles.join('\n')}\n`);

const esm = fs.readFileSync(
  path.join(repoRoot, 'server/node_modules/sensitive-word-tool/lib/index.esm.js'),
  'utf8',
);
const noiseMatch = esm.match(/generateNoiseWordMap\("((?:[^"\\]|\\.)*)"\)/);
if (!noiseMatch) {
  throw new Error('noise characters not found in sensitive-word-tool');
}
const noiseChars = JSON.parse(`"${noiseMatch[1]}"`);
fs.writeFileSync(path.join(wordOutDir, 'noise-chars.txt'), noiseChars);

process.stdout.write(
  `builtin=${words.size}, lexicon=${lexiconFiles.length}, noise=${[...noiseChars].length}\n`,
);
