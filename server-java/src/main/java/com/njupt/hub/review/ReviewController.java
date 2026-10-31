package com.njupt.hub.review;

import java.util.List;
import java.util.Map;

import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.token.JwtPrincipal;
import com.njupt.hub.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final ClientIpResolver ipResolver;

    public ReviewController(ReviewService reviewService, ClientIpResolver ipResolver) {
        this.reviewService = reviewService;
        this.ipResolver = ipResolver;
    }

    @GetMapping("/items")
    public ResponseEntity<List<ReviewItemView>> items(
        @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(reviewService.listItems(type));
    }

    @GetMapping("/admin/pending-reviews")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<List<PendingReviewView>> pendingReviews() {
        return ResponseEntity.ok(reviewService.pendingReviews());
    }

    @PatchMapping("/admin/reviews/{reviewId}/status")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> updateReviewStatus(
        @PathVariable String reviewId,
        @RequestBody(required = false) ReviewStatusRequest request
    ) {
        reviewService.updateReviewStatus(
            parseId(reviewId), request == null ? null : request.status());
        return ResponseEntity.ok(Map.of("message", "状态更新成功"));
    }

    @DeleteMapping("/admin/reviews/{reviewId}")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> deleteReviewByAdmin(@PathVariable String reviewId) {
        reviewService.deleteReviewByAdmin(parseId(reviewId));
        return ResponseEntity.ok(Map.of("message", "评价已删除"));
    }

    @GetMapping("/admin/reports")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<List<ReportView>> reports() {
        return ResponseEntity.ok(reviewService.reports());
    }

    @DeleteMapping("/admin/reports/{reportId}")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> dismissReport(@PathVariable String reportId) {
        reviewService.deleteReport(parseId(reportId));
        return ResponseEntity.ok(Map.of("message", "举报已撤销"));
    }

    @PostMapping("/items")
    public ResponseEntity<AdminItemView> createItem(
        @RequestBody(required = false) ReviewItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createItem(request));
    }

    @PatchMapping("/admin/items/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<AdminItemView> updateItem(
        @PathVariable String id,
        @RequestBody(required = false) ReviewItemRequest request
    ) {
        return ResponseEntity.ok(reviewService.updateItem(parseId(id), request));
    }

    @DeleteMapping("/admin/items/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> deleteItem(@PathVariable String id) {
        reviewService.deleteItem(parseId(id));
        return ResponseEntity.ok(Map.of("message", "项目已删除"));
    }

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(
        @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        return ResponseEntity.ok(Map.of("url", reviewService.uploadReviewImage(image)));
    }

    @PostMapping("/admin/items/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> uploadItemImage(
        @PathVariable String id,
        @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        String imageUrl = reviewService.uploadItemImage(parseId(id), image);
        return ResponseEntity.ok(Map.of("message", "上传成功", "imageUrl", imageUrl));
    }

    @PostMapping("/submit")
    public ResponseEntity<ReviewCreatedView> submit(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ReviewSubmitRequest request,
        HttpServletRequest httpRequest
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.submit(
            request,
            principal == null ? null : principal.userId(),
            ipResolver.resolve(httpRequest)));
    }

    @PostMapping("/{reviewId}/like")
    public ResponseEntity<LikeResult> like(
        @PathVariable String reviewId,
        @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ResponseEntity.ok(reviewService.toggleLike(parseId(reviewId), principal.userId()));
    }

    @PostMapping("/{reviewId}/reply")
    public ResponseEntity<ReplyView> reply(
        @PathVariable String reviewId,
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ReplyRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.reply(
            parseId(reviewId), principal.userId(), request == null ? null : request.content()));
    }

    @PostMapping("/{reviewId}/report")
    public ResponseEntity<ReportResult> report(
        @PathVariable String reviewId,
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ReportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.report(
            parseId(reviewId), principal.userId(), request == null ? null : request.reason()));
    }

    @GetMapping("/user/stats")
    public ResponseEntity<Map<String, Long>> stats(@AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(Map.of(
            "receivedLikes", reviewService.receivedLikes(principal.userId())));
    }

    @PatchMapping("/{reviewId}")
    public ResponseEntity<ReviewCreatedView> updateOwn(
        @PathVariable String reviewId,
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) UpdateReviewRequest request
    ) {
        return ResponseEntity.ok(reviewService.updateOwn(
            parseId(reviewId), principal.userId(), request));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Map<String, String>> deleteOwn(
        @PathVariable String reviewId,
        @AuthenticationPrincipal JwtPrincipal principal
    ) {
        reviewService.deleteOwn(parseId(reviewId), principal.userId());
        return ResponseEntity.ok(Map.of("message", "评价已删除"));
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<ReviewItemDetail> item(
        @PathVariable String id,
        @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ResponseEntity.ok(reviewService.getItem(
            parseId(id), principal == null ? null : principal.userId()));
    }

    private long parseId(String value) {
        try {
            long id = Long.parseLong(value);
            if (id <= 0) {
                throw new NumberFormatException();
            }
            return id;
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的 ID");
        }
    }
}
