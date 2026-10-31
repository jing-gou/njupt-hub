package com.njupt.hub.review;

import java.util.List;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Component;

@Component
public class ReviewCleanup {

    private final LikeMapper likes;
    private final ReplyMapper replies;
    private final ReportMapper reports;
    private final ReviewMapper reviews;

    public ReviewCleanup(
        LikeMapper likes,
        ReplyMapper replies,
        ReportMapper reports,
        ReviewMapper reviews
    ) {
        this.likes = likes;
        this.replies = replies;
        this.reports = reports;
        this.reviews = reviews;
    }

    public void deleteRelations(List<Integer> reviewIds) {
        if (reviewIds == null || reviewIds.isEmpty()) {
            return;
        }
        likes.delete(new LambdaQueryWrapper<Like>().in(Like::getReviewId, reviewIds));
        replies.delete(new LambdaQueryWrapper<Reply>().in(Reply::getReviewId, reviewIds));
        reports.delete(new LambdaQueryWrapper<Report>().in(Report::getReviewId, reviewIds));
    }

    public void deleteWithRelations(int reviewId) {
        deleteRelations(List.of(reviewId));
        reviews.deleteById(reviewId);
    }
}
