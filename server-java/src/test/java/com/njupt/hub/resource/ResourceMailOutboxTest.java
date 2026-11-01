package com.njupt.hub.resource;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.mail.outbox.MailOutbox;
import com.njupt.hub.mail.outbox.MailOutboxMapper;
import com.njupt.hub.mail.outbox.MailSender;
import com.njupt.hub.mail.outbox.OutboxDispatcher;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ResourceMailOutboxTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    MailOutboxMapper outbox;

    @Autowired
    OutboxDispatcher dispatcher;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    ObjectMapper mapper;

    @MockitoBean
    MailSender mailSender;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql", "resources.sql"));
    }

    @Test
    void approval_enqueues_review_mail_once() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reviewNotification.sent").value(true));

        List<MailOutbox> rows = outbox.selectList(null);
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getDedupeKey()).isEqualTo("RESOURCE_REVIEW:2002:APPROVED");
        assertThat(rows.get(0).getStatus()).isEqualTo("PENDING");

        OutboxDispatcher.DispatchResult result = dispatcher.dispatchDue(10);
        assertThat(result.sent()).isEqualTo(1);
        verify(mailSender).send(anyString(), anyString(), anyString(), anyString());

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk());

        assertThat(outbox.selectCount(null)).isEqualTo(1);
    }

    @Test
    void thank_you_enqueues_once() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/resources/upload/thank-you")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[2001,2003]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.emailSent").value(true));

        assertThat(outbox.selectCount(null)).isEqualTo(1);
        assertThat(outbox.selectList(null).get(0).getDedupeKey()).startsWith("THANK_YOU:1001:");
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(
                    java.util.Map.of("username", username, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();
    }
}
