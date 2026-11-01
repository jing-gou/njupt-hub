package com.njupt.hub.mail.outbox;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {

    private final MailOutboxMapper outbox;

    public OutboxService(MailOutboxMapper outbox) {
        this.outbox = outbox;
    }

    @Transactional
    public Long enqueueAndGetId(String dedupeKey, String mailType, String recipient, RenderedMail mail) {
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

        try {
            outbox.insert(row);
            return row.getId();
        } catch (DuplicateKeyException ex) {
            return null;
        }
    }

    @Transactional
    public boolean enqueue(String dedupeKey, String mailType, String recipient, RenderedMail mail) {
        return enqueueAndGetId(dedupeKey, mailType, recipient, mail) != null;
    }
}
