package com.njupt.hub.resource;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.limit.RateLimiter;
import com.njupt.hub.auth.mail.MailService;
import com.njupt.hub.auth.user.GuestUserService;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.resource.storage.QiniuStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResourceService {

    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);
    private static final String PREFIX_PENDING = "pending";
    private static final String PREFIX_PUBLIC = "public";

    private final ResourceMapper resources;
    private final UserMapper users;
    private final QiniuUrlSigner signer;
    private final QiniuStorage storage;
    private final MailService mailService;
    private final RateLimiter rateLimiter;
    private final GuestUserService guestUserService;

    public ResourceService(
        ResourceMapper resources,
        UserMapper users,
        QiniuUrlSigner signer,
        QiniuStorage storage,
        MailService mailService,
        RateLimiter rateLimiter,
        GuestUserService guestUserService
    ) {
        this.resources = resources;
        this.users = users;
        this.signer = signer;
        this.storage = storage;
        this.mailService = mailService;
        this.rateLimiter = rateLimiter;
        this.guestUserService = guestUserService;
    }

    public ResourcePage list(ResourceQuery query) {
        int page = Math.max(query.page(), 1);
        int pageSize = Math.min(Math.max(query.pageSize(), 1), 100);

        LambdaQueryWrapper<Resource> wrapper = new LambdaQueryWrapper<>();
        if (query.course() != null && !query.course().isBlank()) {
            wrapper.eq(Resource::getCourse, query.course());
        }
        if (query.category() != null && !query.category().isBlank()) {
            wrapper.eq(Resource::getCategory, query.category());
        }
        if (query.status() != null && !query.status().isBlank()) {
            wrapper.eq(Resource::getStatus, query.status());
        }
        if (query.uploaderId() != null) {
            wrapper.eq(Resource::getUploaderId, query.uploaderId());
        }
        if (query.q() != null && !query.q().isBlank()) {
            String text = query.q();
            wrapper.and(inner -> inner.like(Resource::getTitle, text)
                .or()
                .like(Resource::getDescription, text));
        }

        String sort = "downloadCount".equals(query.sort()) ? "downloadCount" : "createdAt";
        boolean ascending = "asc".equalsIgnoreCase(query.order());
        wrapper.orderBy(true, ascending,
            "downloadCount".equals(sort) ? Resource::getDownloadCount : Resource::getCreatedAt);

        long total = resources.selectCount(wrapper);
        int offset = (page - 1) * pageSize;
        wrapper.last("LIMIT " + pageSize + " OFFSET " + offset);

        List<Resource> items = resources.selectList(wrapper);
        Map<Integer, User> uploaders = loadUploaders(items);
        List<ResourceView> views = new ArrayList<>();
        for (Resource item : items) {
            views.add(toView(item, uploaders.get(item.getUploaderId())));
        }

        return new ResourcePage(views, page, pageSize, total);
    }

    @Transactional
    public ResourceView create(ResourceCreateRequest request, Long userId) {
        String title = request == null ? null : request.title();
        String fileUrl = request == null ? null : request.fileUrl();
        String course = request == null ? null : request.course();
        if (isBlank(title) || isBlank(fileUrl) || isBlank(course)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "标题、文件链接和课程均为必填项");
        }

        User uploader = userId == null ? guestUser() : users.selectById(userId);
        if (uploader == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }

        LocalDateTime now = LocalDateTime.now();
        Resource resource = new Resource();
        resource.setTitle(String.valueOf(title));
        resource.setDescription(request.description() == null ? null : String.valueOf(request.description()));
        resource.setFileUrl(String.valueOf(fileUrl));
        resource.setCourse(String.valueOf(course));
        resource.setCategory(request.category() == null ? null : String.valueOf(request.category()));
        resource.setUploaderId(uploader.getId());
        resource.setStatus("PENDING");
        resource.setDownloadCount(0);
        resource.setCreatedAt(now);
        resource.setUpdatedAt(now);
        resources.insert(resource);

        return toView(resource, uploader);
    }

    @Transactional
    public List<UploadedResourceView> upload(
        List<MultipartFile> files,
        List<String> titles,
        List<String> paths,
        String course,
        String category,
        Long userId
    ) {
        if (isBlank(course)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "课程名称是必填项");
        }
        if (files == null || files.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "文件是必填项");
        }
        if (files.size() > 30) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "文件数量超过上限");
        }

        User uploader = userId == null ? guestUser() : users.selectById(userId);
        if (uploader == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }

        String normalizedCourse = normalizeCourse(course);
        List<UploadedResourceView> created = new ArrayList<>();

        for (int index = 0; index < files.size(); index++) {
            MultipartFile file = files.get(index);
            String originalName = MultipartFilenameDecoder.decode(file.getOriginalFilename());
            if (originalName == null || originalName.isBlank()) {
                originalName = "未命名文件";
            }

            String title = valueAt(titles, index);
            if (isBlank(title)) {
                title = originalName.replaceFirst("\\.[^/.]+$", "");
            }

            String path = valueAt(paths, index);
            String normalizedPath = normalizePath(path == null ? originalName : path, normalizedCourse);

            byte[] data;
            try {
                data = file.getBytes();
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to read upload file", ex);
            }

            QiniuStorage.UploadResult uploaded = storage.upload(
                data,
                originalName,
                PREFIX_PENDING,
                normalizedCourse,
                file.getContentType());

            LocalDateTime now = LocalDateTime.now();
            Resource resource = new Resource();
            resource.setTitle(String.valueOf(title));
            resource.setFileUrl(storage.rawUrl(uploaded.key()));
            resource.setFileKey(uploaded.key());
            resource.setFileName(normalizedPath);
            resource.setFileSize((int) file.getSize());
            resource.setMimeType(file.getContentType());
            resource.setCourse(String.valueOf(course));
            resource.setCategory(category == null ? null : String.valueOf(category));
            resource.setUploaderId(uploader.getId());
            resource.setStatus("PENDING");
            resource.setDownloadCount(0);
            resource.setCreatedAt(now);
            resource.setUpdatedAt(now);
            resources.insert(resource);

            created.add(new UploadedResourceView(
                resource.getId(),
                resource.getTitle(),
                resource.getCourse(),
                resource.getCategory(),
                resource.getStatus(),
                signer.getSignedUrl(resource.getFileKey()),
                resource.getFileName(),
                resource.getFileSize(),
                resource.getMimeType(),
                toInstant(resource.getCreatedAt())));
        }

        return created;
    }

    public ResourceView get(long id) {
        Resource resource = findResource(id);
        return toView(resource, users.selectById(resource.getUploaderId()));
    }

    @Transactional
    public String downloadUrl(long id) {
        Resource resource = findResource(id);
        String key = resource.getFileKey() != null ? resource.getFileKey() : resource.getFileUrl();
        resources.update(null, new LambdaUpdateWrapper<Resource>()
            .eq(Resource::getId, id)
            .setSql("downloadCount = downloadCount + 1"));
        return storage.signedUrl(key);
    }

    @Transactional
    public DownloadCount incrementDownload(long id) {
        findResource(id);
        resources.update(null, new LambdaUpdateWrapper<Resource>()
            .eq(Resource::getId, id)
            .setSql("downloadCount = downloadCount + 1"));
        Resource updated = resources.selectById(id);
        return new DownloadCount(id, updated.getDownloadCount());
    }

    @Transactional
    public StatusResult updateStatus(long id, String status) {
        if (!"PENDING".equals(status) && !"APPROVED".equals(status) && !"REJECTED".equals(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的状态值");
        }

        Resource resource = findResource(id);
        String previous = resource.getStatus();
        LocalDateTime now = LocalDateTime.now();

        if ("APPROVED".equals(status)
            && resource.getFileKey() != null
            && resource.getFileKey().startsWith(PREFIX_PENDING + "/")) {
            String destination = PREFIX_PUBLIC
                + resource.getFileKey().substring(PREFIX_PENDING.length());
            try {
                storage.move(resource.getFileKey(), destination);
                resource.setFileKey(destination);
                resource.setFileUrl(storage.rawUrl(destination));
            } catch (RuntimeException ex) {
                log.error("Failed to move resource {} to public", id, ex);
            }
        }

        boolean clearFileKey = false;
        if ("REJECTED".equals(status) && resource.getFileKey() != null) {
            try {
                storage.delete(resource.getFileKey());
            } catch (RuntimeException ex) {
                log.error("Failed to delete rejected resource file {}", id, ex);
            }
            clearFileKey = true;
        }

        resource.setStatus(status);
        resource.setUpdatedAt(now);
        resources.updateById(resource);
        if (clearFileKey) {
            resources.update(null, new LambdaUpdateWrapper<Resource>()
                .eq(Resource::getId, id)
                .set(Resource::getFileKey, null));
            resource.setFileKey(null);
        }

        if (!"APPROVED".equals(previous) && "APPROVED".equals(status)) {
            users.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, resource.getUploaderId())
                .ne(User::getUsername, "游客")
                .setSql("experience = experience + 10"));
        }

        return new StatusResult(toView(resource, users.selectById(resource.getUploaderId())), null);
    }

    public ReviewNotification notifyReviewResult(long id, String status) {
        return maybeSendReviewResultEmail(findResource(id), status);
    }

    public ThankYouResult sendThankYou(long userId, List<Long> resourceIds, String ip) {
        if (!rateLimiter.tryAcquire("thank-you", ip == null ? "unknown" : ip,
            10, Duration.ofMinutes(15))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "感谢邮件请求过于频繁，请稍后再试");
        }

        List<Integer> ids = new ArrayList<>();
        if (resourceIds != null) {
            LinkedHashSet<Long> unique = new LinkedHashSet<>(resourceIds);
            for (Long value : unique) {
                if (value != null && value > 0) {
                    ids.add(value.intValue());
                }
            }
        }
        ids = ids.stream().limit(100).toList();
        if (ids.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "没有可发送的通知资料");
        }

        User uploader = users.selectById(userId);
        if (uploader == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }

        List<Resource> resourcesToMail = resources.selectList(new LambdaQueryWrapper<Resource>()
            .in(Resource::getId, ids)
            .eq(Resource::getUploaderId, userId)
            .isNull(Resource::getThankYouEmailSentAt)
            .orderByAsc(Resource::getCreatedAt));

        if (resourcesToMail.isEmpty()) {
            return new ThankYouResult("感谢邮件已发送，无需重复发送", false, null);
        }

        try {
            mailService.sendUploadThankYouEmail(
                uploader.getEmail(), uploader.getUsername(), resourcesToMail);
        } catch (RuntimeException ex) {
            log.error("Failed to send thank-you email for user {}", userId, ex);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "资料上传成功，但感谢邮件暂时发送失败");
        }

        LocalDateTime now = LocalDateTime.now();
        resources.update(null, new LambdaUpdateWrapper<Resource>()
            .in(Resource::getId, resourcesToMail.stream().map(Resource::getId).toList())
            .eq(Resource::getUploaderId, userId)
            .isNull(Resource::getThankYouEmailSentAt)
            .set(Resource::getThankYouEmailSentAt, now));

        return new ThankYouResult("感谢邮件已发送", true, resourcesToMail.size());
    }

    @Transactional
    public ResourceView updateMeta(long id, String title) {
        String nextTitle = title == null ? "" : title.trim();
        if (nextTitle.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "标题不能为空");
        }
        Resource resource = findResource(id);
        resource.setTitle(nextTitle);
        resource.setUpdatedAt(LocalDateTime.now());
        resources.updateById(resource);
        return toView(resource, users.selectById(resource.getUploaderId()));
    }

    @Transactional
    public void delete(long id) {
        Resource resource = findResource(id);
        String key = resource.getFileKey() != null
            ? resource.getFileKey()
            : storage.normalizeKey(resource.getFileUrl());
        if (key != null && !key.isBlank()) {
            try {
                storage.delete(key);
            } catch (RuntimeException ex) {
                log.error("Failed to delete cloud file for resource {}", id, ex);
            }
        }
        resources.deleteById(id);
    }

    private ReviewNotification maybeSendReviewResultEmail(Resource resource, String status) {
        if (!"APPROVED".equals(status) && !"REJECTED".equals(status)) {
            return new ReviewNotification(false, false, true, "status_not_notifiable", null);
        }

        User uploader = users.selectById(resource.getUploaderId());
        if (uploader == null) {
            return new ReviewNotification(false, false, true, "uploader_not_found", null);
        }
        if (uploader.getEmail() == null || uploader.getEmail().isBlank()) {
            return new ReviewNotification(false, false, true, "missing_email", null);
        }
        if ("游客".equals(uploader.getUsername())) {
            return new ReviewNotification(false, false, true, "guest_uploader", null);
        }
        if (status.equals(resource.getReviewResultEmailStatus())
            && resource.getReviewResultEmailSentAt() != null) {
            return new ReviewNotification(false, false, true, "already_sent", null);
        }

        try {
            mailService.sendResourceReviewResultEmail(uploader.getEmail(), uploader.getUsername(), resource);
            LocalDateTime now = LocalDateTime.now();
            resources.update(null, new LambdaUpdateWrapper<Resource>()
                .eq(Resource::getId, resource.getId())
                .set(Resource::getReviewResultEmailSentAt, now)
                .set(Resource::getReviewResultEmailStatus, status)
                .set(Resource::getUpdatedAt, now));
            return new ReviewNotification(true, true, false, "sent", null);
        } catch (RuntimeException ex) {
            log.error("Failed to send review result email for resource {}", resource.getId(), ex);
            return new ReviewNotification(true, false, false, "send_failed",
                ex.getMessage() == null ? "审核结果邮件发送失败" : ex.getMessage());
        }
    }

    private Resource findResource(long id) {
        Resource resource = resources.selectById(id);
        if (resource == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "资源未找到");
        }
        return resource;
    }

    private Map<Integer, User> loadUploaders(List<Resource> items) {
        List<Integer> ids = items.stream()
            .map(Resource::getUploaderId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        Map<Integer, User> uploaders = new HashMap<>();
        if (!ids.isEmpty()) {
            for (User user : users.selectBatchIds(ids)) {
                uploaders.put(user.getId(), user);
            }
        }
        return uploaders;
    }

    private User guestUser() {
        return guestUserService.getOrCreate();
    }

    private String normalizeCourse(String course) {
        return course.replace('\\', '/').replaceAll("^/+|/+$", "");
    }

    private String normalizePath(String path, String normalizedCourse) {
        String normalized = path.replace('\\', '/').replaceAll("^/+|/+$", "");
        String[] parts = normalized.split("/");
        if (parts.length > 1 && parts[0].equals(normalizedCourse)) {
            return String.join("/", java.util.Arrays.copyOfRange(parts, 1, parts.length));
        }
        return normalized;
    }

    private String valueAt(List<String> values, int index) {
        return values != null && index < values.size() ? values.get(index) : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.of("Asia/Shanghai")).toInstant();
    }

    private ResourceView toView(Resource resource, User uploader) {
        String key = resource.getFileKey() != null ? resource.getFileKey() : resource.getFileUrl();
        ResourceView.UploaderView uploaderView = uploader == null ? null
            : new ResourceView.UploaderView(
                uploader.getId(),
                uploader.getUsername(),
                uploader.getEmail(),
                uploader.getRole());

        return new ResourceView(
            resource.getId(),
            resource.getTitle(),
            resource.getDescription(),
            signer.getSignedUrl(key),
            resource.getCourse(),
            resource.getDownloadCount(),
            toInstant(resource.getCreatedAt()),
            resource.getUploaderId(),
            resource.getStatus(),
            toInstant(resource.getUpdatedAt()),
            resource.getCategory(),
            resource.getFileKey(),
            resource.getFileName(),
            resource.getFileSize(),
            resource.getMimeType(),
            toInstant(resource.getThankYouEmailSentAt()),
            toInstant(resource.getReviewResultEmailSentAt()),
            resource.getReviewResultEmailStatus(),
            uploaderView);
    }
}
