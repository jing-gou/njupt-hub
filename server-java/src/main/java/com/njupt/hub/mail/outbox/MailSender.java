package com.njupt.hub.mail.outbox;

public interface MailSender {

    void send(String to, String subject, String text, String html);
}
