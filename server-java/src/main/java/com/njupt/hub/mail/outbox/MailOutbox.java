package com.njupt.hub.mail.outbox;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("mail_outbox")
public class MailOutbox {

    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("dedupe_key")
    private String dedupeKey;
    @TableField("mail_type")
    private String mailType;
    @TableField("recipient")
    private String recipient;
    @TableField("subject")
    private String subject;
    @TableField("body_text")
    private String bodyText;
    @TableField("body_html")
    private String bodyHtml;
    @TableField("status")
    private String status;
    @TableField("attempts")
    private Integer attempts;
    @TableField("next_attempt_at")
    private LocalDateTime nextAttemptAt;
    @TableField("sent_at")
    private LocalDateTime sentAt;
    @TableField("last_error")
    private String lastError;
    @TableField("created_at")
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDedupeKey() { return dedupeKey; }
    public void setDedupeKey(String dedupeKey) { this.dedupeKey = dedupeKey; }
    public String getMailType() { return mailType; }
    public void setMailType(String mailType) { this.mailType = mailType; }
    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getBodyText() { return bodyText; }
    public void setBodyText(String bodyText) { this.bodyText = bodyText; }
    public String getBodyHtml() { return bodyHtml; }
    public void setBodyHtml(String bodyHtml) { this.bodyHtml = bodyHtml; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getAttempts() { return attempts; }
    public void setAttempts(Integer attempts) { this.attempts = attempts; }
    public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(LocalDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
