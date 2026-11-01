package com.njupt.hub.mail.outbox.rabbit;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("demo")
public class RabbitConfig {

    public static final String EXCHANGE = "mail.outbox";
    public static final String QUEUE = "mail.outbox.dispatch";
    public static final String ROUTING_KEY = "outbox";

    @Bean
    DirectExchange mailOutboxExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    Queue mailOutboxQueue() {
        return new Queue(QUEUE, true);
    }

    @Bean
    Binding mailOutboxBinding(Queue mailOutboxQueue, DirectExchange mailOutboxExchange) {
        return BindingBuilder.bind(mailOutboxQueue).to(mailOutboxExchange).with(ROUTING_KEY);
    }
}
