package com.njupt.hub.resource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;
    private final ObjectMapper objectMapper;
    private final ClientIpResolver ipResolver;

    public ResourceController(
        ResourceService resourceService,
        ObjectMapper objectMapper,
        ClientIpResolver ipResolver
    ) {
        this.resourceService = resourceService;
        this.objectMapper = objectMapper;
        this.ipResolver = ipResolver;
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

    @PostMapping("/upload/thank-you")
    public ResponseEntity<Map<String, Object>> thankYou(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ThankYouRequest request,
        HttpServletRequest httpRequest
    ) {
        ThankYouResult result = resourceService.sendThankYou(
            principal.userId(),
            request == null ? null : request.resourceIds(),
            ipResolver.resolve(httpRequest));

        Map<String, Object> body = new HashMap<>();
        body.put("message", result.message());
        body.put("emailSent", result.emailSent());
        if (result.resourceCount() != null) {
            body.put("resourceCount", result.resourceCount());
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}/download-url")
    public ResponseEntity<Map<String, String>> downloadUrl(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("downloadUrl", resourceService.downloadUrl(parseId(id))));
    }

    @PostMapping("/{id}/download")
    public ResponseEntity<DownloadCount> download(@PathVariable String id) {
        return ResponseEntity.ok(resourceService.incrementDownload(parseId(id)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, Object>> updateStatus(
        @PathVariable String id,
        @RequestBody(required = false) StatusRequest request
    ) {
        StatusResult result = resourceService.updateStatus(
            parseId(id), request == null ? null : request.status());
        Map<String, Object> body = objectMapper.convertValue(
            result.resource(), new TypeReference<>() {
            });
        body.put("reviewNotification", result.notification());
        return ResponseEntity.ok(body);
    }

    @PatchMapping("/{id}/meta")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<ResourceView> updateMeta(
        @PathVariable String id,
        @RequestBody(required = false) MetaRequest request
    ) {
        return ResponseEntity.ok(resourceService.updateMeta(
            parseId(id), request == null ? null : request.title()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DEV')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        resourceService.delete(parseId(id));
        return ResponseEntity.ok(Map.of("message", "资源已删除"));
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
