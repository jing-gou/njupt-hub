package com.njupt.hub.review;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

public record ReviewCreatedView(
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
    @JsonInclude(JsonInclude.Include.NON_NULL) String message
) {

    public record Reviewer(String username) {
    }
}
