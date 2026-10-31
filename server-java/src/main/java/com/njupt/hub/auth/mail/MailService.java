package com.njupt.hub.auth.mail;

public interface MailService {

    void sendVerificationCode(String to, String code);

    void sendResetPasswordCode(String to, String code);
}
