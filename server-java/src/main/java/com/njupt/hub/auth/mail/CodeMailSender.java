package com.njupt.hub.auth.mail;

public interface CodeMailSender {

    void sendVerificationCode(String to, String code);

    void sendResetPasswordCode(String to, String code);
}
