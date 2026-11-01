package com.njupt.hub.review;

public record ReviewItemRequest(
    String title,
    String description,
    String imageUrl,
    String type,
    String location,
    String college
) {
}
