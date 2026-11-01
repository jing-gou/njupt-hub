package com.njupt.hub.mail.outbox.rabbit;

import com.njupt.hub.mail.outbox.OutboxDispatcher;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RabbitOutboxListenerTest {

    @Test
    void delegates_message_to_dispatcher() {
        OutboxDispatcher dispatcher = mock(OutboxDispatcher.class);
        new RabbitOutboxListener(dispatcher).onMessage("42");

        verify(dispatcher).dispatchOne(42L);
    }
}
