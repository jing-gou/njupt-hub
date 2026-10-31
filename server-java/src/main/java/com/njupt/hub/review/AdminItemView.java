package com.njupt.hub.review;

import java.time.Instant;

public record AdminItemView(
    Integer id,
    String title,
    String description,
    String imageUrl,
    String type,
    String location,
    String college,
    Double avgRating,
    Instant createdAt,
    Instant updatedAt
) {
}
