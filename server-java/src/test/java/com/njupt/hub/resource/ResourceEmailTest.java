package com.njupt.hub.resource;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.auth.mail.MailService;
import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ResourceEmailTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    ObjectMapper mapper;

    @MockitoBean
    MailService mailService;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql", "resources.sql"));
    }

    @Test
    void sends_thank_you_once_and_marks_resources() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/resources/upload/thank-you")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[2001,2003,2001]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.emailSent").value(true))
            .andExpect(jsonPath("$.resourceCount").value(2));

        verify(mailService).sendUploadThankYouEmail(eq("alice@example.com"), eq("alice"), anyList());

        Integer marked = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `Resource` WHERE id IN (2001,2003) "
                + "AND thankYouEmailSentAt IS NOT NULL", Integer.class);
        assertThat(marked).isEqualTo(2);

        mvc.perform(post("/api/resources/upload/thank-you")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[2001,2003]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.emailSent").value(false));
    }

    @Test
    void mail_failure_returns_502() throws Exception {
        String token = login("alice", "Password123");
        doThrow(new IllegalStateException("smtp down"))
            .when(mailService).sendUploadThankYouEmail(anyString(), anyString(), anyList());

        mvc.perform(post("/api/resources/upload/thank-you")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[2001]}"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.message").value("资料上传成功，但感谢邮件暂时发送失败"));
    }

    @Test
    void empty_ids_return_400_and_guest_returns_401() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/resources/upload/thank-you")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("没有可发送的通知资料"));

        mvc.perform(post("/api/resources/upload/thank-you")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resourceIds\":[2001]}"))
            .andExpect(status().isUnauthorized());
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
