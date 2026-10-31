package com.njupt.hub.resource;

import java.time.LocalDateTime;

public record UploadedResourceView(
    Integer id,
    String title,
    String course,
    String category,
    String status,
    String fileUrl,
    String fileName,
    Integer fileSize,
    String mimeType,
    LocalDateTime createdAt
) {
}
