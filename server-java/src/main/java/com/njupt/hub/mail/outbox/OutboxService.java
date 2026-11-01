package com.njupt.hub.mail.outbox;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {

    private final MailOutboxMapper outbox;

    public OutboxService(MailOutboxMapper outbox) {
        this.outbox = outbox;
    }

    @Transactional
    public boolean enqueue(String dedupeKey, String mailType, String recipient, RenderedMail mail) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        MailOutbox row = new MailOutbox();
        row.setDedupeKey(dedupeKey);
        row.setMailType(mailType);
        row.setRecipient(recipient);
        row.setSubject(mail.subject());
        row.setBodyText(mail.text());
        row.setBodyHtml(mail.html());
        row.setStatus(OutboxStatus.PENDING.name());
        row.setAttempts(0);
        row.setNextAttemptAt(now);
        row.setCreatedAt(now);

        return outbox.insertIgnore(row) > 0;
    }
}
