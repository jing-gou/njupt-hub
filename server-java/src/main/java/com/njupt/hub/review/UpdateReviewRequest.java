package com.njupt.hub.review;

public record UpdateReviewRequest(
    Double rating,
    String comment,
    String imageUrl
) {
}
