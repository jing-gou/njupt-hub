import prisma from '../lib/prisma.js';
import { uploadToQiniu, getSignedUrl, moveFile, deleteFile, PREFIX_PENDING, PREFIX_PUBLIC, normalizeStoredFileKey } from '../lib/qiniu.js';

const parseIntOr = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const decodeMultipartText = (value) => {
  const raw = String(value ?? '');
  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    if (decoded.includes('�')) return raw;
    return decoded;
  } catch {
    return raw;
  }
};

export const listResources = async (req, res) => {
  try {
    const {
      course,
      category,
      status,
      q,
      uploaderId,
      page = '1',
      pageSize = '20',
      sort = 'createdAt',
      order = 'desc',
    } = req.query ?? {};

    const take = Math.min(Math.max(parseIntOr(pageSize, 20), 1), 100);
    const currentPage = Math.max(parseIntOr(page, 1), 1);
    const skip = (currentPage - 1) * take;

    const where = {
      ...(course ? { course: String(course) } : {}),
      ...(category ? { category: String(category) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(uploaderId ? { uploaderId: Number(uploaderId) } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: String(q) } },
              { description: { contains: String(q) } },
            ],
          }
        : {}),
    };

    const orderByKey = sort === 'downloadCount' ? 'downloadCount' : 'createdAt';
    const orderByDir = order === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy: { [orderByKey]: orderByDir },
        include: {
          uploader: { select: { id: true, username: true, email: true, role: true } },
        },
      }),
    ]);

    return res.status(200).json({
      items: items.map(i => ({
        ...i,
        fileUrl: getSignedUrl(i.fileKey || i.fileUrl)
      })),
      page: currentPage,
      pageSize: take,
      total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getResource = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, username: true, email: true, role: true } },
      },
    });

    if (!resource) {
      return res.status(404).json({ message: '资源未找到' });
    }

    return res.status(200).json({
      ...resource,
      fileUrl: getSignedUrl(resource.fileKey || resource.fileUrl)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createResource = async (req, res) => {
  try {
    const { title, description, fileUrl, course, category } = req.body ?? {};
    if (!title || !fileUrl || !course) {
      return res.status(400).json({ message: '标题、文件链接和课程均为必填项' });
    }

    const resource = await prisma.resource.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        fileUrl: String(fileUrl),
        course: String(course),
        category: category ? String(category) : null,
        uploaderId: req.user.id,
      },
      include: {
        uploader: { select: { id: true, username: true, email: true, role: true } },
      },
    });

    return res.status(201).json({
      ...resource,
      fileUrl: getSignedUrl(resource.fileKey || resource.fileUrl)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateResourceStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }
    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(String(status))) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return res.status(404).json({ message: '资源未找到' });
    }

    let updateData = { status: String(status) };

    // 如果状态变为 APPROVED，将文件从 pending/ 移到 public/
    if (status === 'APPROVED' && resource.fileKey && resource.fileKey.startsWith(PREFIX_PENDING)) {
      try {
        const newKey = resource.fileKey.replace(PREFIX_PENDING, PREFIX_PUBLIC);
        const { url: newUrl } = await moveFile(resource.fileKey, newKey);
        updateData.fileKey = newKey;
        updateData.fileUrl = newUrl;
      } catch (moveErr) {
        console.error('Failed to move file to public folder:', moveErr);
        // 如果移动失败，可能文件已经在目标位置，或者源文件不存在，继续更新数据库状态
      }
    }

    // 如果状态变为 REJECTED，删除云端文件并清理文件字段
    if (status === 'REJECTED' && resource.fileKey) {
      try {
        await deleteFile(resource.fileKey);
      } catch (deleteErr) {
        console.error('Failed to delete rejected file from cloud storage:', deleteErr);
      }
      updateData.fileKey = null;
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      ...updated,
      fileUrl: getSignedUrl(updated.fileKey || updated.fileUrl)
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: '资源未找到' });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const updateResourceMeta = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }

    const { title } = req.body ?? {};
    const nextTitle = String(title || '').trim();
    if (!nextTitle) {
      return res.status(400).json({ message: '标题不能为空' });
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { title: nextTitle },
      include: {
        uploader: { select: { id: true, username: true, email: true, role: true } },
      },
    });

    return res.status(200).json({
      ...updated,
      fileUrl: getSignedUrl(updated.fileKey || updated.fileUrl),
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: '资源未找到' });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const deleteResourceByAdmin = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return res.status(404).json({ message: '资源未找到' });
    }

    const fileKey = resource.fileKey || normalizeStoredFileKey(resource.fileUrl);
    if (fileKey) {
      try {
        await deleteFile(fileKey);
      } catch (deleteErr) {
        console.error('Failed to delete file from cloud storage:', deleteErr);
      }
    }

    await prisma.resource.delete({ where: { id } });
    return res.status(200).json({ message: '资源已删除' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDownloadUrl = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { fileKey: true, fileUrl: true },
    });

    if (!resource) {
      return res.status(404).json({ message: '资源未找到' });
    }

    // 如果是私有读，生成签名 URL；否则返回原 URL
    const downloadUrl = await getSignedUrl(resource.fileKey || resource.fileUrl);

    // 记录下载次数
    await prisma.resource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    return res.status(200).json({ downloadUrl });
  } catch (error) {
    console.error('Get download URL error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const incrementDownload = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: '无效的 ID' });
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
      select: { id: true, downloadCount: true },
    });

    return res.status(200).json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: '资源未找到' });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const uploadResources = async (req, res) => {
  try {
    const { course, category } = req.body ?? {};
    const files = Array.isArray(req.files) ? req.files : [];
    if (!course) {
      return res.status(400).json({ message: '课程名称是必填项' });
    }
    if (files.length === 0) {
      return res.status(400).json({ message: '文件是必填项' });
    }

    const titlesRaw = req.body?.titles;
    const titles = Array.isArray(titlesRaw) ? titlesRaw : titlesRaw ? [titlesRaw] : [];
    const pathsRaw = req.body?.paths;
    const paths = Array.isArray(pathsRaw) ? pathsRaw : pathsRaw ? [pathsRaw] : [];

    const created = await Promise.all(
      files.map(async (f, idx) => {
        const t = titles[idx];
        const p = paths[idx];
        const originalName = decodeMultipartText(f.originalname);
        const defaultTitle = String(originalName).replace(/\.[^/.]+$/, '');
        const title = t ? String(t) : defaultTitle;
        const normalizedPath = p
          ? String(p).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
          : String(originalName);
        
        // 上传到七牛云 (初始进入待审核目录 pending/)
        const { url: fileUrl, name: fileKey } = await uploadToQiniu(f.buffer, originalName, PREFIX_PENDING, course, f.mimetype);
        
        let uploaderId = req.user?.id;
        if (!uploaderId) {
          // 如果没有登录，查找或创建“游客”用户
          const guestUser = await prisma.user.upsert({
            where: { username: '游客' },
            update: {},
            create: {
              username: '游客',
              password: 'guest-no-password', // 不允许登录
              email: 'guest@njupt.hub',
              role: 'USER',
            },
          });
          uploaderId = guestUser.id;
        }

        return prisma.resource.create({
          data: {
            title,
            fileUrl,
            fileKey,
            fileName: normalizedPath,
            fileSize: f.size,
            mimeType: f.mimetype,
            course: String(course),
            category: category ? String(category) : null,
            uploaderId: uploaderId,
            status: 'PENDING',
          },
          select: {
            id: true,
            title: true,
            course: true,
            category: true,
            status: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
        });
      }),
    );

    return res.status(201).json({ 
      items: created.map(i => ({
        ...i,
        fileUrl: getSignedUrl(i.fileKey || i.fileUrl)
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
