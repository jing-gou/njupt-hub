package com.njupt.hub.mail.outbox.rabbit;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("demo")
public class RabbitOutboxPublisher {

    private final RabbitTemplate rabbitTemplate;

    public RabbitOutboxPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(long outboxId) {
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.ROUTING_KEY,
            Long.toString(outboxId));
    }
}
