package com.njupt.hub.review;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ReviewService {

    private static final String APPROVED = "APPROVED";

    private final ReviewableItemMapper items;
    private final ReviewMapper reviews;
    private final LikeMapper likes;
    private final ReplyMapper replies;
    private final UserMapper users;
    private final QiniuUrlSigner signer;

    public ReviewService(
        ReviewableItemMapper items,
        ReviewMapper reviews,
        LikeMapper likes,
        ReplyMapper replies,
        UserMapper users,
        QiniuUrlSigner signer
    ) {
        this.items = items;
        this.reviews = reviews;
        this.likes = likes;
        this.replies = replies;
        this.users = users;
        this.signer = signer;
    }

    public List<ReviewItemView> listItems(String type) {
        LambdaQueryWrapper<ReviewableItem> wrapper = new LambdaQueryWrapper<>();
        if (type != null && !type.isBlank()) {
            wrapper.eq(ReviewableItem::getType, type);
        }
        List<ReviewableItem> itemList = items.selectList(wrapper);
        if (itemList.isEmpty()) {
            return List.of();
        }

        List<Integer> itemIds = itemList.stream().map(ReviewableItem::getId).toList();
        List<Review> approvedReviews = reviews.selectList(new LambdaQueryWrapper<Review>()
            .in(Review::getItemId, itemIds)
            .eq(Review::getStatus, APPROVED)
            .orderByDesc(Review::getCreatedAt));

        Map<Integer, List<Review>> byItem = approvedReviews.stream()
            .collect(Collectors.groupingBy(Review::getItemId));
        Map<Integer, User> usersById = loadUsers(approvedReviews.stream()
            .map(Review::getReviewerId).toList());

        List<ReviewItemView> result = new ArrayList<>();
        for (ReviewableItem item : itemList) {
            List<Review> itemReviews = byItem.getOrDefault(item.getId(), List.of());
            List<ReviewSummaryView> latest = itemReviews.isEmpty()
                ? List.of()
                : List.of(toSummary(itemReviews.get(0), usersById.get(itemReviews.get(0).getReviewerId())));

            result.add(new ReviewItemView(
                item.getId(),
                item.getTitle(),
                item.getDescription(),
                signer.getSignedUrl(item.getImageUrl()),
                item.getType(),
                item.getLocation(),
                item.getCollege(),
                item.getAvgRating() == null ? 0 : item.getAvgRating(),
                itemReviews.size(),
                latest));
        }
        return result;
    }

    public ReviewItemDetail getItem(long id, Long userId) {
        ReviewableItem item = items.selectById(id);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "项目未找到");
        }

        LambdaQueryWrapper<Review> reviewQuery = new LambdaQueryWrapper<Review>()
            .eq(Review::getItemId, id)
            .orderByDesc(Review::getCreatedAt);
        if (userId == null) {
            reviewQuery.eq(Review::getStatus, APPROVED);
        } else {
            reviewQuery.and(inner -> inner
                .eq(Review::getStatus, APPROVED)
                .or()
                .eq(Review::getReviewerId, userId));
        }
        List<Review> itemReviews = reviews.selectList(reviewQuery);
        long reviewCount = reviews.selectCount(new LambdaQueryWrapper<Review>()
            .eq(Review::getItemId, id));

        List<Integer> reviewIds = itemReviews.stream().map(Review::getId).toList();
        List<Like> likeList = reviewIds.isEmpty() ? List.of()
            : likes.selectList(new LambdaQueryWrapper<Like>().in(Like::getReviewId, reviewIds));
        List<Reply> replyList = reviewIds.isEmpty() ? List.of()
            : replies.selectList(new LambdaQueryWrapper<Reply>()
                .in(Reply::getReviewId, reviewIds)
                .orderByAsc(Reply::getCreatedAt));

        Map<Integer, List<Like>> likesByReview = likeList.stream()
            .collect(Collectors.groupingBy(Like::getReviewId));
        Map<Integer, List<Reply>> repliesByReview = replyList.stream()
            .collect(Collectors.groupingBy(Reply::getReviewId));
        Map<Integer, User> usersById = loadUsers(itemReviews.stream()
            .map(Review::getReviewerId).toList());

        List<ReviewDetailView> detailViews = new ArrayList<>();
        for (Review review : itemReviews) {
            List<Like> reviewLikes = likesByReview.getOrDefault(review.getId(), List.of());
            List<Reply> reviewReplies = repliesByReview.getOrDefault(review.getId(), List.of());
            boolean isLiked = userId != null && reviewLikes.stream()
                .anyMatch(like -> Objects.equals(like.getUserId(), userId.intValue()));

            detailViews.add(new ReviewDetailView(
                review.getId(),
                review.getRating(),
                review.getComment(),
                review.getIp(),
                toInstant(review.getCreatedAt()),
                review.getReviewerId(),
                toInstant(review.getUpdatedAt()),
                signer.getSignedUrl(review.getImageUrl()),
                review.getStatus(),
                review.getItemId(),
                reviewer(usersById.get(review.getReviewerId())),
                reviewLikes.stream().map(like -> new ReviewDetailView.LikeView(like.getUserId())).toList(),
                reviewReplies.stream().map(this::toReplyView).toList(),
                isLiked,
                reviewLikes.size()));
        }

        return new ReviewItemDetail(
            item.getId(),
            item.getTitle(),
            item.getDescription(),
            signer.getSignedUrl(item.getImageUrl()),
            item.getType(),
            item.getLocation(),
            item.getCollege(),
            item.getAvgRating() == null ? 0 : item.getAvgRating(),
            reviewCount,
            detailViews);
    }

    private ReviewSummaryView toSummary(Review review, User reviewer) {
        return new ReviewSummaryView(
            review.getId(),
            review.getRating(),
            review.getComment(),
            review.getIp(),
            toInstant(review.getCreatedAt()),
            review.getReviewerId(),
            toInstant(review.getUpdatedAt()),
            signer.getSignedUrl(review.getImageUrl()),
            review.getStatus(),
            review.getItemId(),
            reviewer(reviewer));
    }

    private ReplyView toReplyView(Reply reply) {
        User user = users.selectById(reply.getUserId());
        return new ReplyView(
            reply.getId(),
            reply.getContent(),
            reply.getUserId(),
            reply.getReviewId(),
            toInstant(reply.getCreatedAt()),
            new ReplyView.UserSummary(user == null ? null : user.getUsername()));
    }

    private ReviewSummaryView.ReviewerSummary reviewer(User user) {
        if (user == null) {
            return null;
        }
        return new ReviewSummaryView.ReviewerSummary(
            user.getUsername(), signer.getSignedUrl(user.getAvatarKey()));
    }

    private Map<Integer, User> loadUsers(List<Integer> ids) {
        List<Integer> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        Map<Integer, User> result = new HashMap<>();
        for (User user : users.selectBatchIds(distinct)) {
            result.put(user.getId(), user);
        }
        return result;
    }

    private Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.toInstant(ZoneOffset.UTC);
    }
}
