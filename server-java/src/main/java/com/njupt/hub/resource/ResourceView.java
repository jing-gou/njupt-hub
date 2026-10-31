package com.njupt.hub.resource;

import java.time.LocalDateTime;

public record ResourceView(
    Integer id,
    String title,
    String description,
    String fileUrl,
    String course,
    Integer downloadCount,
    LocalDateTime createdAt,
    Integer uploaderId,
    String status,
    LocalDateTime updatedAt,
    String category,
    String fileKey,
    String fileName,
    Integer fileSize,
    String mimeType,
    LocalDateTime thankYouEmailSentAt,
    LocalDateTime reviewResultEmailSentAt,
    String reviewResultEmailStatus,
    UploaderView uploader
) {

    public record UploaderView(Integer id, String username, String email, String role) {
    }
}
