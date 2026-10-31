package com.njupt.hub.support;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.resource.storage.QiniuStorage;

public class InMemoryQiniuStorage implements QiniuStorage {

    private final Map<String, String> objects = new LinkedHashMap<>();

    @Override
    public UploadResult upload(byte[] data, String originalName, String prefix, String subPath,
                               String contentType) {
        String key = prefix + (subPath == null || subPath.isBlank() ? "" : "/" + subPath)
            + "/" + UUID.randomUUID() + "-" + originalName;
        objects.put(key, "https://kodo.test/" + key);
        return new UploadResult(key, "https://kodo.test/" + key);
    }

    @Override
    public void move(String sourceKey, String destinationKey) {
        String value = objects.remove(sourceKey);
        if (value == null) {
            throw new IllegalStateException("missing key: " + sourceKey);
        }
        objects.put(destinationKey, "https://kodo.test/" + destinationKey);
    }

    @Override
    public void delete(String key) {
        objects.remove(key);
    }

    @Override
    public String signedUrl(String key) {
        return key == null || key.isBlank() ? "" : "https://kodo.test/" + key;
    }

    @Override
    public String normalizeKey(String value) {
        return QiniuUrlSigner.normalizeStoredFileKey(value);
    }

    public boolean contains(String key) {
        return objects.containsKey(key);
    }
}
