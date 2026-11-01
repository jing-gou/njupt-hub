package com.njupt.hub.mail.outbox.rabbit;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RabbitOutboxPublisherTest {

    @Test
    void publishes_outbox_id() {
        RabbitTemplate template = mock(RabbitTemplate.class);
        new RabbitOutboxPublisher(template).publish(42L);

        verify(template).convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.ROUTING_KEY, "42");
    }
}
