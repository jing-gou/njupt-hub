package com.njupt.hub.review;

public record ReviewSubmitRequest(
    Integer itemId,
    Double rating,
    String comment,
    String imageUrl
) {
}
