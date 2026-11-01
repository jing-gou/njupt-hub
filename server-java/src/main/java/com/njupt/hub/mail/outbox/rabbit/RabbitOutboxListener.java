package com.njupt.hub.mail.outbox.rabbit;

import com.njupt.hub.mail.outbox.OutboxDispatcher;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("demo")
public class RabbitOutboxListener {

    private final OutboxDispatcher dispatcher;

    public RabbitOutboxListener(OutboxDispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onMessage(String outboxId) {
        dispatcher.dispatchOne(Long.parseLong(outboxId));
    }
}
