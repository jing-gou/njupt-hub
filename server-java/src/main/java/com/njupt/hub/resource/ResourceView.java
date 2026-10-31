package com.njupt.hub.resource;

import java.time.Instant;

public record ResourceView(
    Integer id,
    String title,
    String description,
    String fileUrl,
    String course,
    Integer downloadCount,
    Instant createdAt,
    Integer uploaderId,
    String status,
    Instant updatedAt,
    String category,
    String fileKey,
    String fileName,
    Integer fileSize,
    String mimeType,
    Instant thankYouEmailSentAt,
    Instant reviewResultEmailSentAt,
    String reviewResultEmailStatus,
    UploaderView uploader
) {

    public record UploaderView(Integer id, String username, String email, String role) {
    }
}
