package com.njupt.hub.review;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ReviewInteractionTest extends FullStackTestBase {

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

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql", "reviews.sql"));
    }

    @Test
    void toggling_like_updates_experience() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/4001/like")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.liked").value(true))
            .andExpect(jsonPath("$.expDelta").value(2));

        assertThat(experience(1001)).isEqualTo(122);

        mvc.perform(post("/api/reviews/4001/like")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.liked").value(false))
            .andExpect(jsonPath("$.expDelta").value(-2));

        assertThat(experience(1001)).isEqualTo(120);
    }

    @Test
    void liking_guest_review_does_not_change_experience() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/4005/like")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.liked").value(true));

        assertThat(experience(1004)).isEqualTo(50);
    }

    @Test
    void reply_validates_content_and_sensitive_words() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/4001/reply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"同意\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.content").value("同意"))
            .andExpect(jsonPath("$.user.username").value("alice"));

        mvc.perform(post("/api/reviews/4001/reply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("内容是必填项"));

        mvc.perform(post("/api/reviews/4001/reply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"傻逼\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("评论内容包含敏感词，请修改后再提交"));
    }

    @Test
    void report_and_stats() throws Exception {
        String bob = login("bob", "Password123");

        mvc.perform(post("/api/reviews/4001/report")
                .header("Authorization", "Bearer " + bob)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"spam\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.message").value("举报已提交"))
            .andExpect(jsonPath("$.id").exists());

        String alice = login("alice", "Password123");
        mvc.perform(get("/api/reviews/user/stats")
                .header("Authorization", "Bearer " + alice))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receivedLikes").value(2));
    }

    @Test
    void requires_auth() throws Exception {
        mvc.perform(post("/api/reviews/4001/like"))
            .andExpect(status().isUnauthorized());
    }

    private int experience(int userId) {
        return jdbc.queryForObject(
            "SELECT experience FROM `User` WHERE id = ?", Integer.class, userId);
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
