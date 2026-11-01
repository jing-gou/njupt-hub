package com.njupt.hub.observability;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import com.njupt.hub.mail.outbox.MailOutboxMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class OutboxHealthIndicator implements HealthIndicator {

    private final MailOutboxMapper outbox;
    private final long maxBacklog;
    private final Duration maxAge;

    public OutboxHealthIndicator(
        MailOutboxMapper outbox,
        @Value("${mail.outbox.health.max-backlog:100}") long maxBacklog,
        @Value("${mail.outbox.health.max-age:15m}") Duration maxAge
    ) {
        this.outbox = outbox;
        this.maxBacklog = maxBacklog;
        this.maxAge = maxAge;
    }

    @Override
    public Health health() {
        long pending = outbox.pendingCount();
        LocalDateTime oldest = outbox.oldestDue();
        long ageSeconds = oldest == null ? 0
            : Math.max(Duration.between(oldest, LocalDateTime.now(ZoneOffset.UTC)).toSeconds(), 0);

        Health.Builder builder = pending > maxBacklog || ageSeconds > maxAge.toSeconds()
            ? Health.down()
            : Health.up();

        return builder
            .withDetail("pending", pending)
            .withDetail("oldestAgeSeconds", ageSeconds)
            .build();
    }
}
