import qiniu from 'qiniu';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config'; // 确保在读取变量前加载配置

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = process.env.QINIU_DOMAIN;

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();

// 目录常量
export const PREFIX_PUBLIC = 'public';
export const PREFIX_PENDING = 'pending';
export const PREFIX_ASSETS = 'assets';

/**
 * 上传 Buffer 到七牛云
 * @param {Buffer} buffer 文件内容
 * @param {string} originalName 原始文件名
 * @param {string} prefix 目录前缀 (如 PREFIX_PENDING)
 * @param {string} subPath 子路径 (如 '数学/第一章')
 * @param {string} mimeType 文件 MIME 类型
 */
export const uploadToQiniu = async (buffer, originalName, prefix = PREFIX_PENDING, subPath = '', mimeType = null) => {
  const ext = path.extname(originalName);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  
  // 构造最终路径: prefix/subPath/fileName
  let fullPath = prefix;
  if (subPath) fullPath += `/${subPath.replace(/^\/+|\/+$/g, '')}`;
  fullPath += `/${fileName}`;

  const options = {
    scope: bucket,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  if (mimeType) {
    putExtra.mimeType = mimeType;
  }

  return new Promise((resolve, reject) => {
    formUploader.put(uploadToken, fullPath, buffer, putExtra, (respErr, respBody, respInfo) => {
      if (respErr) {
        reject(respErr);
      } else if (respInfo.statusCode === 200) {
        const url = `http://${domain}/${fullPath}`;
        resolve({
          url,
          name: fullPath,
        });
      } else {
        reject(new Error(`Qiniu upload failed with status ${respInfo.statusCode}`));
      }
    });
  });
};

/**
 * 移动/重命名文件 (常用于审核通过后从 pending 移到 public)
 * @param {string} srcKey 源路径
 * @param {string} destKey 目标路径
 */
export const moveFile = async (srcKey, destKey) => {
  const bucketManager = new qiniu.rs.BucketManager(mac, config);
  return new Promise((resolve, reject) => {
    bucketManager.move(bucket, srcKey, bucket, destKey, { force: true }, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        resolve({
          url: `http://${domain}/${destKey}`,
          name: destKey
        });
      } else {
        reject(new Error(`Qiniu move failed with status ${respInfo.statusCode}: ${respBody.error}`));
      }
    });
  });
};

/**
 * 内部签名逻辑
 */
const signUrl = (key, expires) => {
  // 构造基础 URL (优先使用 https，除非是七牛测试域名可能只支持 http)
  const protocol = domain.includes('.clouddn.com') ? 'http' : 'https';
  const baseUrl = encodeURI(`${protocol}://${domain.replace(/\/$/, '')}/${key}`);
  
  // 判断是否需要签名
  const isPrivateStr = String(process.env.QINIU_IS_PRIVATE || '').trim().toLowerCase();
  const isNotPrivate = isPrivateStr === 'false' || isPrivateStr === '0' || isPrivateStr === '';
  
  if (!isNotPrivate) {
    const deadline = Math.floor(Date.now() / 1000) + expires;
    const urlWithE = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'e=' + deadline;
    const token = qiniu.util.hmacSha1(urlWithE, secretKey);
    const encodedToken = qiniu.util.base64ToUrlSafe(token);
    const finalToken = `${accessKey}:${encodedToken}`;
    
    return `${urlWithE}&token=${finalToken}`;
  }
  
  return baseUrl;
};

/**
 * 生成签名下载链接 (针对私有空间)
 */
export const getSignedUrl = (fileKey, expires = 7200) => {
  if (!fileKey) return '';

  // 1. 判断是否已经是外部链接
  if (fileKey.includes('://')) {
    try {
      const url = new URL(fileKey);
      // 如果不是我们的七牛域名，直接返回原链接
      if (url.hostname !== domain) {
        return fileKey;
      }
      // 如果是我们的域名，提取 Key 以便后续重新签名
      let key = decodeURIComponent(url.pathname.slice(1));
      key = key.replace(/^\//, '');
      return signUrl(key, expires);
    } catch (e) {
      // URL 解析失败，按 key 处理
    }
  }

  // 2. 按 Key 处理
  const key = fileKey.replace(/^\//, '');
  return signUrl(key, expires);
};

/**
 * 将可访问 URL/Key 统一归一化为可入库存储的 key
 */
export const normalizeStoredFileKey = (fileValue) => {
  if (!fileValue) return '';

  const raw = String(fileValue).trim();
  if (!raw) return '';

  if (raw.includes('://')) {
    try {
      const url = new URL(raw);
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
      return raw.replace(/^\/+/, '');
    }
  }

  return raw.replace(/^\/+/, '');
};

/**
 * 删除文件
 */
export const deleteFile = async (fileKey) => {
  const bucketManager = new qiniu.rs.BucketManager(mac, config);
  return new Promise((resolve, reject) => {
    bucketManager.delete(bucket, fileKey, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Qiniu delete failed with status ${respInfo.statusCode}: ${respBody.error}`));
      }
    });
  });
};

export default { 
  uploadToQiniu, 
  getSignedUrl, 
  normalizeStoredFileKey,
  moveFile,
  deleteFile,
  PREFIX_PUBLIC,
  PREFIX_PENDING,
  PREFIX_ASSETS
};
