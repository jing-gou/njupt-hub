package com.njupt.hub.mail.outbox;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.njupt.hub.auth.mail.MailTemplates;
import com.njupt.hub.auth.mail.ResourceMailSender;
import com.njupt.hub.mail.outbox.rabbit.RabbitOutboxPublisher;
import com.njupt.hub.resource.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.stereotype.Component;

@Component
public class OutboxResourceMailSender implements ResourceMailSender {

    private static final Logger log = LoggerFactory.getLogger(OutboxResourceMailSender.class);

    private final OutboxService outbox;
    private final MailTemplates templates;
    private final ObjectProvider<RabbitOutboxPublisher> rabbitPublisher;

    public OutboxResourceMailSender(
        OutboxService outbox,
        MailTemplates templates,
        ObjectProvider<RabbitOutboxPublisher> rabbitPublisher
    ) {
        this.outbox = outbox;
        this.templates = templates;
        this.rabbitPublisher = rabbitPublisher;
    }

    @Override
    public boolean enqueueThankYou(String to, String username, List<Resource> resources) {
        String ids = resources.stream()
            .map(Resource::getId)
            .sorted(Comparator.naturalOrder())
            .map(String::valueOf)
            .collect(Collectors.joining(","));
        String key = "THANK_YOU:" + userId(resources) + ":" + sha256(ids);
        Long id = outbox.enqueueAndGetId(key, "THANK_YOU", to, templates.uploadThankYou(username, resources));
        publish(id);
        return id != null;
    }

    @Override
    public boolean enqueueReviewResult(String to, String username, Resource resource) {
        String key = "RESOURCE_REVIEW:" + resource.getId() + ":" + resource.getStatus();
        Long id = outbox.enqueueAndGetId(key, "RESOURCE_REVIEW", to, templates.reviewResult(username, resource));
        publish(id);
        return id != null;
    }

    private void publish(Long id) {
        if (id == null) {
            return;
        }
        Runnable task = () -> rabbitPublisher.ifAvailable(publisher -> {
            try {
                publisher.publish(id);
            } catch (RuntimeException ex) {
                log.warn("Rabbit outbox publish failed for {}, relying on scheduled dispatcher", id, ex);
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private String userId(List<Resource> resources) {
        return resources.isEmpty() || resources.get(0).getUploaderId() == null
            ? "unknown"
            : String.valueOf(resources.get(0).getUploaderId());
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash thank-you dedupe key", ex);
        }
    }
}
