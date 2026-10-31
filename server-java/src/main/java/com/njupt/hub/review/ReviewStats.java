package com.njupt.hub.review;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;

public final class ReviewStats {

    private ReviewStats() {
    }

    public static double weightedAverage(List<Review> reviews, Map<Integer, User> usersById) {
        double weightedSum = 0;
        double totalWeight = 0;
        for (Review review : reviews) {
            User reviewer = usersById.get(review.getReviewerId());
            double weight = reviewer != null && "游客".equals(reviewer.getUsername()) ? 0.2 : 0.8;
            double rating = review.getRating() == null ? 0 : review.getRating();
            weightedSum += rating * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    public static void recalculate(
        ReviewMapper reviews,
        ReviewableItemMapper items,
        UserMapper users,
        long itemId
    ) {
        List<Review> approved = reviews.selectList(new LambdaQueryWrapper<Review>()
            .eq(Review::getItemId, itemId)
            .eq(Review::getStatus, "APPROVED"));

        Map<Integer, User> usersById = new HashMap<>();
        List<Integer> reviewerIds = approved.stream()
            .map(Review::getReviewerId)
            .distinct()
            .toList();
        if (!reviewerIds.isEmpty()) {
            for (User user : users.selectBatchIds(reviewerIds)) {
                usersById.put(user.getId(), user);
            }
        }

        ReviewableItem item = items.selectById(itemId);
        if (item == null) {
            return;
        }
        item.setAvgRating(weightedAverage(approved, usersById));
        item.setUpdatedAt(LocalDateTime.now());
        items.updateById(item);
    }
}
