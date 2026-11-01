package com.njupt.hub.observability;

import com.njupt.hub.mail.outbox.OutboxService;
import com.njupt.hub.mail.outbox.RenderedMail;
import com.njupt.hub.support.FullStackTestBase;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.actuate.health.Status;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
    "mail.outbox.health.max-backlog=0",
    "mail.outbox.poll-interval=3600000"
})
@AutoConfigureMockMvc
@Transactional
class ObservabilityTest extends FullStackTestBase {

    @Autowired
    OutboxService outboxService;

    @Autowired
    OutboxHealthIndicator health;

    @Autowired
    MeterRegistry meters;

    @Autowired
    MockMvc mvc;

    @Test
    void exposes_outbox_metrics_and_health() throws Exception {
        outboxService.enqueue("obs-1", "TEST", "a@b.com",
            new RenderedMail("subject", "text", "<p>html</p>"));

        assertThat(meters.get("mail_outbox_pending").gauge().value()).isGreaterThanOrEqualTo(1);
        assertThat(health.health().getStatus()).isEqualTo(Status.DOWN);

        String body = mvc.perform(get("/actuator/prometheus"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("mail_outbox_pending");
    }
}
