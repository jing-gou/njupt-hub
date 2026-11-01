package com.njupt.hub.review;

import java.time.Instant;

public record ReplyView(
    Integer id,
    String content,
    Integer userId,
    Integer reviewId,
    Instant createdAt,
    UserSummary user
) {

    public record UserSummary(String username) {
    }
}
