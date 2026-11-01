package com.njupt.hub.mail.outbox;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class OutboxServiceTest extends FullStackTestBase {

    @Autowired
    OutboxService service;

    @Autowired
    MailOutboxMapper outbox;

    @Test
    void deduplicates_by_key() {
        RenderedMail mail = new RenderedMail("subject", "text", "<p>html</p>");

        assertThat(service.enqueue("dedupe-1", "TEST", "a@b.com", mail)).isTrue();
        assertThat(service.enqueue("dedupe-1", "TEST", "a@b.com", mail)).isFalse();

        assertThat(outbox.selectCount(null)).isEqualTo(1);
        MailOutbox row = outbox.selectList(null).get(0);
        assertThat(row.getStatus()).isEqualTo(OutboxStatus.PENDING.name());
        assertThat(row.getAttempts()).isZero();
    }

    @Test
    void different_keys_create_separate_rows() {
        RenderedMail mail = new RenderedMail("subject", "text", "<p>html</p>");

        assertThat(service.enqueue("dedupe-1", "TEST", "a@b.com", mail)).isTrue();
        assertThat(service.enqueue("dedupe-2", "TEST", "a@b.com", mail)).isTrue();

        assertThat(outbox.selectCount(null)).isEqualTo(2);
    }
}
