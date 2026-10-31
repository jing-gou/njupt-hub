package com.njupt.hub.resource;

public record ResourceCreateRequest(
    String title,
    String description,
    String fileUrl,
    String course,
    String category
) {
}
