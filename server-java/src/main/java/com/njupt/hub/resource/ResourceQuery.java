package com.njupt.hub.resource;

public record ResourceQuery(
    String course,
    String category,
    String status,
    String q,
    Integer uploaderId,
    int page,
    int pageSize,
    String sort,
    String order
) {
}
