package com.njupt.hub.auth.mail;

import java.util.List;

import com.njupt.hub.resource.Resource;

public interface MailService {

    void sendVerificationCode(String to, String code);

    void sendResetPasswordCode(String to, String code);

    void sendUploadThankYouEmail(String to, String username, List<Resource> resources);

    void sendResourceReviewResultEmail(String to, String username, Resource resource);
}
