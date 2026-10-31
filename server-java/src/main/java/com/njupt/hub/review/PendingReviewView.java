package com.njupt.hub.review;

import java.time.Instant;

public record PendingReviewView(
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

    public record Reviewer(String username) {
    }

    public record Item(String title, String type) {
    }
}
