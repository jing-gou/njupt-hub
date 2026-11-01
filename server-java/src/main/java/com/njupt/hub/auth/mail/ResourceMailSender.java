package com.njupt.hub.auth.mail;

import java.util.List;

import com.njupt.hub.resource.Resource;

public interface ResourceMailSender {

    boolean enqueueThankYou(String to, String username, List<Resource> resources);

    boolean enqueueReviewResult(String to, String username, Resource resource);
}
