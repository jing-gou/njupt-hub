package com.njupt.hub.resource.storage;

public interface QiniuStorage {

    UploadResult upload(byte[] data, String originalName, String prefix, String subPath, String contentType);

    void move(String sourceKey, String destinationKey);

    void delete(String key);

    String signedUrl(String key);

    String normalizeKey(String value);

    record UploadResult(String key, String url) {
    }
}
