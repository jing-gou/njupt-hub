package com.njupt.hub.resource;

import java.util.List;
import java.util.Map;

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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Integer uploaderId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "desc") String order
    ) {
        ResourcePage result = resourceService.list(
            new ResourceQuery(course, category, status, q, uploaderId, page, pageSize, sort, order));

        return ResponseEntity.ok(Map.of(
            "items", result.items(),
            "page", result.page(),
            "pageSize", result.pageSize(),
            "total", result.total()));
    }

    @PostMapping
    public ResponseEntity<ResourceView> create(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ResourceCreateRequest request
    ) {
        Long userId = principal == null ? null : principal.userId();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(resourceService.create(request, userId));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestParam(required = false) List<MultipartFile> files,
        @RequestParam(required = false) List<String> titles,
        @RequestParam(required = false) List<String> paths,
        @RequestParam(required = false) String course,
        @RequestParam(required = false) String category
    ) {
        Long userId = principal == null ? null : principal.userId();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("items", resourceService.upload(
                files, titles, paths, course, category, userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceView> get(@PathVariable String id) {
        return ResponseEntity.ok(resourceService.get(parseId(id)));
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
