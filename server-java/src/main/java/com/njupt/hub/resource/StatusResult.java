package com.njupt.hub.resource;

public record StatusResult(
    ResourceView resource,
    ReviewNotification notification
) {
}
