package com.njupt.hub.resource;

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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ResourceService {

    private final ResourceMapper resources;
    private final UserMapper users;
    private final QiniuUrlSigner signer;

    public ResourceService(ResourceMapper resources, UserMapper users, QiniuUrlSigner signer) {
        this.resources = resources;
        this.users = users;
        this.signer = signer;
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
