package com.njupt.hub.observability;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import com.njupt.hub.mail.outbox.MailOutboxMapper;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class OutboxMetrics {

    public OutboxMetrics(MeterRegistry registry, MailOutboxMapper outbox) {
        Gauge.builder("mail_outbox_pending", outbox, MailOutboxMapper::pendingCount)
            .description("Pending or retrying outbox rows")
            .register(registry);

        Gauge.builder("mail_outbox_oldest_age_seconds", outbox, mapper -> {
                LocalDateTime oldest = mapper.oldestCreatedAt();
                if (oldest == null) {
                    return 0d;
                }
                long seconds = Duration.between(oldest, LocalDateTime.now(ZoneOffset.UTC)).toSeconds();
                return (double) Math.max(seconds, 0);
            })
            .description("Age of the oldest outbox row")
            .register(registry);

        Gauge.builder("mail_outbox_dead", outbox, MailOutboxMapper::deadCount)
            .description("Dead outbox rows")
            .register(registry);
    }
}
