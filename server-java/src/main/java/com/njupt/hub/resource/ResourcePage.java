package com.njupt.hub.resource;

import java.util.List;

public record ResourcePage(
    List<ResourceView> items,
    int page,
    int pageSize,
    long total
) {
}
