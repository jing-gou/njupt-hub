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
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.limit.RateLimiter;
import com.njupt.hub.auth.user.GuestUserService;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.resource.storage.QiniuStorage;
import com.njupt.hub.sensitive.SensitiveWordFilter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    private static final String APPROVED = "APPROVED";

    private final ReviewableItemMapper items;
    private final ReviewMapper reviews;
    private final LikeMapper likes;
    private final ReplyMapper replies;
    private final UserMapper users;
    private final QiniuUrlSigner signer;
    private final GuestUserService guestUsers;
    private final SensitiveWordFilter sensitiveWords;
    private final RateLimiter rateLimiter;
    private final QiniuStorage storage;

    public ReviewService(
        ReviewableItemMapper items,
        ReviewMapper reviews,
        LikeMapper likes,
        ReplyMapper replies,
        UserMapper users,
        QiniuUrlSigner signer,
        GuestUserService guestUsers,
        SensitiveWordFilter sensitiveWords,
        RateLimiter rateLimiter,
        QiniuStorage storage
    ) {
        this.items = items;
        this.reviews = reviews;
        this.likes = likes;
        this.replies = replies;
        this.users = users;
        this.signer = signer;
        this.guestUsers = guestUsers;
        this.sensitiveWords = sensitiveWords;
        this.rateLimiter = rateLimiter;
        this.storage = storage;
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

    public String uploadReviewImage(org.springframework.web.multipart.MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "未上传文件");
        }
        try {
            QiniuStorage.UploadResult uploaded = storage.upload(
                file.getBytes(),
                file.getOriginalFilename() == null ? "review-image" : file.getOriginalFilename(),
                "assets",
                "reviews",
                file.getContentType());
            return signer.getSignedUrl(uploaded.key());
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("Failed to read review image", ex);
        }
    }

    @Transactional
    public String uploadItemImage(long itemId, org.springframework.web.multipart.MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "未上传文件");
        }
        ReviewableItem item = items.selectById(itemId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "项目未找到");
        }

        QiniuStorage.UploadResult uploaded;
        try {
            uploaded = storage.upload(
                file.getBytes(),
                file.getOriginalFilename() == null ? "item-image" : file.getOriginalFilename(),
                "assets",
                "items",
                file.getContentType());
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("Failed to read item image", ex);
        }

        String oldKey = item.getImageUrl();
        item.setImageUrl(uploaded.key());
        item.setUpdatedAt(java.time.LocalDateTime.now());
        items.updateById(item);

        if (oldKey != null && !oldKey.isBlank() && !oldKey.equals(uploaded.key())) {
            try {
                storage.delete(QiniuUrlSigner.normalizeStoredFileKey(oldKey));
            } catch (RuntimeException ignored) {
                // best-effort cleanup
            }
        }
        return signer.getSignedUrl(uploaded.key());
    }

    @Transactional
    public ReviewCreatedView submit(ReviewSubmitRequest request, Long userId, String ip) {
        if (!rateLimiter.tryAcquire("review-submit", ip == null ? "unknown" : ip,
            5, java.time.Duration.ofMinutes(15))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
        }

        Integer itemId = request == null ? null : request.itemId();
        Double rating = request == null ? null : request.rating();
        if (itemId == null || rating == null || rating == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "项目 ID 和评分均为必填项");
        }

        ReviewableItem item = items.selectById(itemId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "评价项目不存在");
        }

        String comment = request.comment() == null ? null : request.comment().trim();
        if (comment != null && !comment.isEmpty() && sensitiveWords.contains(comment)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "评价内容包含敏感词，请修改后再提交");
        }
        String imageKey = request.imageUrl() == null || request.imageUrl().isBlank()
            ? null
            : QiniuUrlSigner.normalizeStoredFileKey(request.imageUrl());

        User reviewer;
        if (userId == null) {
            reviewer = guestUsers.getOrCreate();
            if (comment != null && !comment.isEmpty()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "游客仅允许评分，请登录后发表文字评论");
            }
            if (imageKey != null) {
                throw new ApiException(HttpStatus.FORBIDDEN, "游客仅允许评分，请登录后上传图片");
            }
        } else {
            reviewer = users.selectById(userId);
            if (reviewer == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
            }
        }

        LambdaQueryWrapper<Review> latestQuery = new LambdaQueryWrapper<Review>()
            .eq(Review::getItemId, itemId)
            .orderByDesc(Review::getCreatedAt)
            .last("LIMIT 1");
        if (userId == null) {
            latestQuery.eq(Review::getReviewerId, reviewer.getId()).eq(Review::getIp, ip);
        } else {
            latestQuery.eq(Review::getReviewerId, reviewer.getId());
        }
        Review latest = reviews.selectOne(latestQuery);
        boolean withinWindow = latest != null
            && latest.getCreatedAt() != null
            && latest.getCreatedAt().isAfter(java.time.LocalDateTime.now().minusDays(1));

        boolean needModeration = "MENTOR".equals(item.getType())
            && ((comment != null && !comment.isEmpty()) || imageKey != null);
        String status = needModeration ? "PENDING" : "APPROVED";
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        Review review;
        if (withinWindow) {
            review = latest;
            review.setRating(rating);
            review.setComment(comment);
            review.setImageUrl(imageKey);
            review.setStatus(status);
            review.setIp(ip);
            review.setUpdatedAt(now);
            reviews.updateById(review);
        } else {
            review = new Review();
            review.setRating(rating);
            review.setComment(comment);
            review.setImageUrl(imageKey);
            review.setStatus(status);
            review.setIp(ip);
            review.setReviewerId(reviewer.getId());
            review.setItemId(itemId);
            review.setCreatedAt(now);
            review.setUpdatedAt(now);
            reviews.insert(review);
        }

        ReviewStats.recalculate(reviews, items, users, itemId);

        if (userId != null && !withinWindow) {
            users.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .setSql("experience = experience + 5"));
        }

        return toCreatedView(review, reviewer,
            "PENDING".equals(status) ? "评价已提交，审核通过后可公开展示" : null);
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

    private ReviewCreatedView toCreatedView(Review review, User reviewer, String message) {
        return new ReviewCreatedView(
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
            new ReviewCreatedView.Reviewer(reviewer == null ? null : reviewer.getUsername()),
            message);
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
