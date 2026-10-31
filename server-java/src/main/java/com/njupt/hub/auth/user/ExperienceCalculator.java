package com.njupt.hub.auth.user;

import com.njupt.hub.auth.avatar.QiniuUrlSigner;

public final class ExperienceCalculator {

    private ExperienceCalculator() {
    }

    public static UserView toView(User user, QiniuUrlSigner signer) {
        int experience = user.getExperience() == null ? 0 : user.getExperience();
        int level = experience / 100 + 1;
        return new UserView(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            experience,
            signer.getSignedUrl(user.getAvatarKey()),
            level,
            level * 100,
            experience - (level - 1) * 100,
            100);
    }

    public static LeaderboardItem toLeaderboard(User user, int rank, QiniuUrlSigner signer) {
        int experience = user.getExperience() == null ? 0 : user.getExperience();
        int level = experience / 100 + 1;
        return new LeaderboardItem(
            rank,
            user.getId(),
            user.getUsername(),
            user.getRole(),
            experience,
            signer.getSignedUrl(user.getAvatarKey()),
            level,
            level * 100,
            experience - (level - 1) * 100,
            100);
    }
}
