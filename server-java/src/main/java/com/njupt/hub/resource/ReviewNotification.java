package com.njupt.hub.resource;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReviewNotification(
    boolean attempted,
    boolean sent,
    boolean skipped,
    String reason,
    String message
) {
}
