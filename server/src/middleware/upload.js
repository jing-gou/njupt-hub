import multer from 'multer';

const maxMb = Number(process.env.UPLOAD_MAX_MB ?? 150);
const maxBytes = Number.isFinite(maxMb) ? maxMb * 1024 * 1024 : 200 * 1024 * 1024;

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: maxBytes },
});

