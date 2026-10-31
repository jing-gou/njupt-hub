package com.njupt.hub.resource;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("Resource")
public class Resource {

    @TableId(type = IdType.AUTO)
    private Integer id;
    private String title;
    private String description;
    private String fileUrl;
    private String course;
    private Integer downloadCount;
    private LocalDateTime createdAt;
    private Integer uploaderId;
    private String status;
    private LocalDateTime updatedAt;
    private String category;
    private String fileKey;
    private String fileName;
    private Integer fileSize;
    private String mimeType;
    private LocalDateTime thankYouEmailSentAt;
    private LocalDateTime reviewResultEmailSentAt;
    private String reviewResultEmailStatus;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public Integer getDownloadCount() {
        return downloadCount;
    }

    public void setDownloadCount(Integer downloadCount) {
        this.downloadCount = downloadCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getUploaderId() {
        return uploaderId;
    }

    public void setUploaderId(Integer uploaderId) {
        this.uploaderId = uploaderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getFileKey() {
        return fileKey;
    }

    public void setFileKey(String fileKey) {
        this.fileKey = fileKey;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Integer getFileSize() {
        return fileSize;
    }

    public void setFileSize(Integer fileSize) {
        this.fileSize = fileSize;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public LocalDateTime getThankYouEmailSentAt() {
        return thankYouEmailSentAt;
    }

    public void setThankYouEmailSentAt(LocalDateTime thankYouEmailSentAt) {
        this.thankYouEmailSentAt = thankYouEmailSentAt;
    }

    public LocalDateTime getReviewResultEmailSentAt() {
        return reviewResultEmailSentAt;
    }

    public void setReviewResultEmailSentAt(LocalDateTime reviewResultEmailSentAt) {
        this.reviewResultEmailSentAt = reviewResultEmailSentAt;
    }

    public String getReviewResultEmailStatus() {
        return reviewResultEmailStatus;
    }

    public void setReviewResultEmailStatus(String reviewResultEmailStatus) {
        this.reviewResultEmailStatus = reviewResultEmailStatus;
    }
}
