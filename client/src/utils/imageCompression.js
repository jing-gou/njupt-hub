const MAX_EDGE = 1600;
const TARGET_BYTES = 900 * 1024; // ~900KB
const MIN_QUALITY = 0.55;

const loadImageFromFile = async (file) => {
  if ('createImageBitmap' in window) {
    return await createImageBitmap(file);
  }

  return await new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解码失败'));
    };
    image.src = url;
  });
};

export const compressImageForUpload = async (file) => {
  if (!file?.type?.startsWith('image/')) return file;

  const source = await loadImageFromFile(file);
  const width = source.width || 0;
  const height = source.height || 0;
  if (!width || !height) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let quality = 0.84;

  while (quality >= MIN_QUALITY) {
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });
    if (!blob) break;

    if (blob.size <= TARGET_BYTES || quality <= MIN_QUALITY) {
      const extension = outputType === 'image/png' ? 'png' : 'jpg';
      const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
      return new File([blob], `${baseName}.${extension}`, {
        type: outputType,
        lastModified: Date.now(),
      });
    }

    quality -= 0.08;
  }

  return file;
};
