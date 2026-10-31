package com.njupt.hub.resource;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.resource.storage.QiniuStorage;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResourceService {

    private static final String PREFIX_PENDING = "pending";

    private final ResourceMapper resources;
    private final UserMapper users;
    private final QiniuUrlSigner signer;
    private final QiniuStorage storage;

    public ResourceService(
        ResourceMapper resources,
        UserMapper users,
        QiniuUrlSigner signer,
        QiniuStorage storage
    ) {
        this.resources = resources;
        this.users = users;
        this.signer = signer;
        this.storage = storage;
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
            resource.setFileUrl(uploaded.url());
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
                resource.getCreatedAt()));
        }

        return created;
    }

    public ResourceView get(long id) {
        Resource resource = resources.selectById(id);
        if (resource == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "资源未找到");
        }
        return toView(resource, users.selectById(resource.getUploaderId()));
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
        User guest = users.selectOne(
            new LambdaQueryWrapper<User>().eq(User::getUsername, "游客"));
        if (guest != null) {
            return guest;
        }

        guest = new User();
        guest.setUsername("游客");
        guest.setPassword("guest-no-password");
        guest.setEmail("guest@njupt.hub");
        guest.setRole("USER");
        guest.setExperience(0);
        try {
            users.insert(guest);
            return guest;
        } catch (DuplicateKeyException ex) {
            return users.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, "游客"));
        }
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
            resource.getCreatedAt(),
            resource.getUploaderId(),
            resource.getStatus(),
            resource.getUpdatedAt(),
            resource.getCategory(),
            resource.getFileKey(),
            resource.getFileName(),
            resource.getFileSize(),
            resource.getMimeType(),
            resource.getThankYouEmailSentAt(),
            resource.getReviewResultEmailSentAt(),
            resource.getReviewResultEmailStatus(),
            uploaderView);
    }
}
