package com.njupt.hub.resource.storage;

public class QiniuStorageException extends RuntimeException {

    public QiniuStorageException(String message, Throwable cause) {
        super(message, cause);
    }

    public QiniuStorageException(String message) {
        super(message);
    }
}
