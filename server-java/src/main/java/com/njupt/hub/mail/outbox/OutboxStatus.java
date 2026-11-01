package com.njupt.hub.mail.outbox;

public enum OutboxStatus {
    PENDING,
    PROCESSING,
    RETRY,
    SENT,
    DEAD
}
