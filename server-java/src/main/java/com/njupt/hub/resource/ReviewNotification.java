package com.njupt.hub.resource;

public record ReviewNotification(
    boolean attempted,
    boolean sent,
    boolean skipped,
    String reason,
    String message
) {
}
