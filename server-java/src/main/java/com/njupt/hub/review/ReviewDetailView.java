package com.njupt.hub.review;

import java.time.Instant;
import java.util.List;

public record ReviewDetailView(
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
    ReviewSummaryView.ReviewerSummary reviewer,
    List<LikeView> likes,
    List<ReplyView> replies,
    boolean isLiked,
    int likesCount
) {

    public record LikeView(Integer userId) {
    }
}
