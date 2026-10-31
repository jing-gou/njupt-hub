package com.njupt.hub.review;

import java.time.Instant;

public record ReportView(
    Integer id,
    String reason,
    Integer userId,
    Integer reviewId,
    Instant createdAt,
    User user,
    Review review
) {

    public record User(String username) {
    }

    public record Review(
        Integer id,
        Double rating,
        String comment,
        String ip,
        Instant createdAt,
        Integer reviewerId,
        Instant updatedAt,
        String imageUrl,
        String status,
        Integer itemId,
        Reviewer reviewer,
        Item item
    ) {
    }

    public record Reviewer(String username) {
    }

    public record Item(String title) {
    }
}
