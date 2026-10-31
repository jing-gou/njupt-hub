package com.njupt.hub.resource.storage;

import java.io.ByteArrayInputStream;
import java.util.UUID;

import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.config.QiniuProperties;
import com.qiniu.common.QiniuException;
import com.qiniu.http.Response;
import com.qiniu.storage.BucketManager;
import com.qiniu.storage.Configuration;
import com.qiniu.storage.Region;
import com.qiniu.storage.UploadManager;
import com.qiniu.util.Auth;
import com.qiniu.util.StringMap;
import org.springframework.stereotype.Component;

@Component
public class QiniuStorageClient implements QiniuStorage {

    private final Auth auth;
    private final Configuration configuration;
    private final UploadManager uploadManager;
    private final BucketManager bucketManager;
    private final String bucket;
    private final QiniuUrlSigner signer;

    public QiniuStorageClient(QiniuProperties properties, QiniuUrlSigner signer) {
        this.auth = Auth.create(properties.accessKey(), properties.secretKey());
        this.configuration = new Configuration(Region.autoRegion());
        this.uploadManager = new UploadManager(configuration);
        this.bucketManager = new BucketManager(auth, configuration);
        this.bucket = properties.bucket();
        this.signer = signer;
    }

    @Override
    public UploadResult upload(byte[] data, String originalName, String prefix, String subPath,
                               String contentType) {
        String key = buildKey(prefix, subPath, originalName);
        try {
            String token = auth.uploadToken(bucket);
            StringMap params = new StringMap();
            if (contentType != null && !contentType.isBlank()) {
                params.put("mimeType", contentType);
            }
            Response response = uploadManager.put(
                new ByteArrayInputStream(data), key, token, params, contentType);
            if (!response.isOK()) {
                throw new QiniuStorageException("Qiniu upload failed: " + response.bodyString());
            }
            return new UploadResult(key, signer.getSignedUrl(key));
        } catch (QiniuException ex) {
            throw new QiniuStorageException("Qiniu upload failed", ex);
        }
    }

    @Override
    public void move(String sourceKey, String destinationKey) {
        try {
            Response response = bucketManager.move(bucket, sourceKey, bucket, destinationKey);
            if (!response.isOK()) {
                throw new QiniuStorageException("Qiniu move failed: " + response.bodyString());
            }
        } catch (QiniuException ex) {
            throw new QiniuStorageException("Qiniu move failed", ex);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Response response = bucketManager.delete(bucket, key);
            if (!response.isOK()) {
                throw new QiniuStorageException("Qiniu delete failed: " + response.bodyString());
            }
        } catch (QiniuException ex) {
            throw new QiniuStorageException("Qiniu delete failed", ex);
        }
    }

    @Override
    public String signedUrl(String key) {
        return signer.getSignedUrl(key);
    }

    @Override
    public String normalizeKey(String value) {
        return QiniuUrlSigner.normalizeStoredFileKey(value);
    }

    static String buildKey(String prefix, String subPath, String originalName) {
        String extension = "";
        int dot = originalName == null ? -1 : originalName.lastIndexOf('.');
        if (dot >= 0) {
            extension = originalName.substring(dot);
        }
        String fileName = System.currentTimeMillis() + "-" + UUID.randomUUID() + extension;
        StringBuilder key = new StringBuilder(prefix == null ? "" : prefix.trim());
        if (subPath != null && !subPath.isBlank()) {
            key.append('/').append(subPath.replaceAll("^/+|/+$", ""));
        }
        return key.append('/').append(fileName).toString();
    }
}
