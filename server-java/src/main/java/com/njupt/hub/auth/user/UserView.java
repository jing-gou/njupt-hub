package com.njupt.hub.auth.user;

public record UserView(
    int id,
    String username,
    String email,
    String role,
    int experience,
    String avatarUrl,
    int level,
    int nextLevelExp,
    int levelProgress,
    int levelProgressTotal
) {
}
