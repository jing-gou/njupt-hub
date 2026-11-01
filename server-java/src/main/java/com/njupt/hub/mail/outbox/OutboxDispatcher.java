package com.njupt.hub.mail.outbox;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxDispatcher {

    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);

    private final MailOutboxMapper outbox;
    private final MailSender sender;
    private final int maxAttempts;
    private final int batchSize;
    private final Duration baseBackoff;
    private final MeterRegistry meterRegistry;

    public OutboxDispatcher(
        MailOutboxMapper outbox,
        MailSender sender,
        @Value("${mail.outbox.max-attempts:5}") int maxAttempts,
        @Value("${mail.outbox.batch-size:20}") int batchSize,
        @Value("${mail.outbox.base-backoff:1m}") Duration baseBackoff,
        MeterRegistry meterRegistry
    ) {
        this.outbox = outbox;
        this.sender = sender;
        this.maxAttempts = maxAttempts;
        this.batchSize = batchSize;
        this.baseBackoff = baseBackoff;
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelayString = "${mail.outbox.poll-interval:5000}")
    @Transactional
    public void scheduled() {
        dispatchDue(batchSize);
    }

    @Transactional
    public DispatchResult dispatchDue(int limit) {
        List<MailOutbox> rows = outbox.lockDue(limit);
        int sent = 0;
        int retried = 0;
        int dead = 0;
        for (MailOutbox row : rows) {
            String result = dispatch(row);
            switch (result) {
                case "SENT" -> sent++;
                case "RETRY" -> retried++;
                default -> dead++;
            }
        }
        return new DispatchResult(sent, retried, dead);
    }

    @Transactional
    public boolean dispatchOne(long id) {
        MailOutbox row = outbox.lockById(id);
        if (row == null
            || !(OutboxStatus.PENDING.name().equals(row.getStatus())
                || OutboxStatus.RETRY.name().equals(row.getStatus()))) {
            return false;
        }
        return "SENT".equals(dispatch(row));
    }

    private String dispatch(MailOutbox row) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        try {
            sender.send(row.getRecipient(), row.getSubject(), row.getBodyText(), row.getBodyHtml());
            row.setStatus(OutboxStatus.SENT.name());
            row.setSentAt(now);
            row.setLastError(null);
            outbox.updateById(row);
            meterRegistry.counter("mail_outbox_sent_total").increment();
            return "SENT";
        } catch (RuntimeException ex) {
            int attempts = (row.getAttempts() == null ? 0 : row.getAttempts()) + 1;
            row.setAttempts(attempts);
            row.setLastError(truncate(ex.getMessage()));
            if (attempts >= maxAttempts) {
                row.setStatus(OutboxStatus.DEAD.name());
                log.error("Mail outbox {} moved to DEAD after {} attempts", row.getId(), attempts, ex);
                outbox.updateById(row);
                meterRegistry.counter("mail_outbox_dead_total").increment();
                return "DEAD";
            }

            row.setStatus(OutboxStatus.RETRY.name());
            row.setNextAttemptAt(now.plus(backoff(attempts)));
            log.warn("Mail outbox {} failed (attempt {}), retry later", row.getId(), attempts, ex);
            outbox.updateById(row);
            meterRegistry.counter("mail_outbox_retry_total").increment();
            return "RETRY";
        }
    }

    private Duration backoff(int attempts) {
        long multiplier = 1L << Math.min(Math.max(attempts - 1, 0), 6);
        Duration candidate = baseBackoff.multipliedBy(multiplier);
        return candidate.compareTo(Duration.ofMinutes(60)) > 0
            ? Duration.ofMinutes(60)
            : candidate;
    }

    private String truncate(String value) {
        if (value == null) {
            return "unknown error";
        }
        return value.length() <= 500 ? value : value.substring(0, 500);
    }

    public record DispatchResult(int sent, int retried, int dead) {
    }
}
