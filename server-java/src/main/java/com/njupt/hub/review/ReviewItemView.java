package com.njupt.hub.review;

import java.util.List;

public record ReviewItemView(
    Integer id,
    String title,
    String description,
    String imageUrl,
    String type,
    String location,
    String college,
    Double avgRating,
    long reviewCount,
    List<ReviewSummaryView> reviews
) {
}
