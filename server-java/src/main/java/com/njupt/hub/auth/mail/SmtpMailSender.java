package com.njupt.hub.auth.mail;

import com.njupt.hub.mail.outbox.MailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpMailSender implements MailSender {

    private final SmtpMailService smtpMailService;

    public SmtpMailSender(SmtpMailService smtpMailService) {
        this.smtpMailService = smtpMailService;
    }

    @Override
    public void send(String to, String subject, String text, String html) {
        smtpMailService.send(to, subject, text, html);
    }
}
