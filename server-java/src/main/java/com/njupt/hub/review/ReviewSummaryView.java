package com.njupt.hub.review;

import java.time.Instant;
import java.util.List;

public record ReviewSummaryView(
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
    ReviewerSummary reviewer
) {

    public record ReviewerSummary(String username, String avatarUrl) {
    }
}
