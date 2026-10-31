package com.njupt.hub.auth.user;

public record LeaderboardItem(
    int rank,
    int id,
    String username,
    String role,
    int experience,
    String avatarUrl,
    int level,
    int nextLevelExp,
    int levelProgress,
    int levelProgressTotal
) {
}
