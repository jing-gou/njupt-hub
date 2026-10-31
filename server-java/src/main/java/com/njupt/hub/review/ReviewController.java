package com.njupt.hub.review;

import java.util.List;

import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.token.JwtPrincipal;
import com.njupt.hub.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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
