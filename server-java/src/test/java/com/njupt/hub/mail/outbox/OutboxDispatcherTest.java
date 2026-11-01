package com.njupt.hub.mail.outbox;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@TestPropertySource(properties = "mail.outbox.max-attempts=2")
@Transactional
class OutboxDispatcherTest extends FullStackTestBase {

    @Autowired
    OutboxService service;

    @Autowired
    OutboxDispatcher dispatcher;

    @Autowired
    MailOutboxMapper outbox;

    @MockitoBean
    MailSender sender;

    private final RenderedMail mail = new RenderedMail("subject", "text", "<p>html</p>");

    @BeforeEach
    void cleanOutbox() {
        outbox.delete(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>());
    }

    @Test
    void dispatches_due_mail_and_marks_sent() {
        service.enqueue("dispatch-1", "TEST", "a@b.com", mail);

        OutboxDispatcher.DispatchResult result = dispatcher.dispatchDue(10);

        assertThat(result.sent()).isEqualTo(1);
        verify(sender).send("a@b.com", "subject", "text", "<p>html</p>");
        MailOutbox row = outbox.selectList(null).get(0);
        assertThat(row.getStatus()).isEqualTo(OutboxStatus.SENT.name());
        assertThat(row.getSentAt()).isNotNull();
    }

    @Test
    void failures_retry_then_dead() {
        service.enqueue("dispatch-2", "TEST", "a@b.com", mail);
        doThrow(new IllegalStateException("smtp down"))
            .when(sender).send(anyString(), anyString(), anyString(), anyString());

        OutboxDispatcher.DispatchResult first = dispatcher.dispatchDue(10);
        assertThat(first.retried()).isEqualTo(1);

        MailOutbox row = outbox.selectList(null).get(0);
        assertThat(row.getStatus()).isEqualTo(OutboxStatus.RETRY.name());
        assertThat(row.getAttempts()).isEqualTo(1);
        assertThat(row.getNextAttemptAt()).isAfter(LocalDateTime.now(ZoneOffset.UTC));

        row.setNextAttemptAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        outbox.updateById(row);

        OutboxDispatcher.DispatchResult second = dispatcher.dispatchDue(10);
        assertThat(second.dead()).isEqualTo(1);

        MailOutbox dead = outbox.selectById(row.getId());
        assertThat(dead.getStatus()).isEqualTo(OutboxStatus.DEAD.name());
        assertThat(dead.getAttempts()).isEqualTo(2);
    }

    @Test
    void dispatch_one_is_idempotent_after_sent() {
        service.enqueue("dispatch-3", "TEST", "a@b.com", mail);

        assertThat(dispatcher.dispatchOne(outbox.selectList(null).get(0).getId())).isTrue();
        assertThat(dispatcher.dispatchOne(outbox.selectList(null).get(0).getId())).isFalse();
    }
}
