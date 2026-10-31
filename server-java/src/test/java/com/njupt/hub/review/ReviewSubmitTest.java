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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ReviewSubmitTest extends FullStackTestBase {

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
    void mentor_text_review_is_pending_and_adds_experience() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":5,\"comment\":\"很好\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.reviewer.username").value("alice"))
            .andExpect(jsonPath("$.message").value("评价已提交，审核通过后可公开展示"));

        assertThat(experience(1001)).isEqualTo(125);
        assertThat(avg(3004)).isEqualTo(0.0);
    }

    @Test
    void plain_rating_is_approved_and_recalculates_average() throws Exception {
        String token = login("bob", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":5}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("APPROVED"));

        assertThat(experience(1002)).isEqualTo(85);
        assertThat(avg(3004)).isEqualTo(5.0);
    }

    @Test
    void guest_can_rate_once_per_ip_and_cannot_comment() throws Exception {
        mvc.perform(post("/api/reviews/submit")
                .header("X-Real-IP", "9.9.9.9")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":4}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.reviewer.username").value("游客"))
            .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(post("/api/reviews/submit")
                .header("X-Real-IP", "9.9.9.9")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":2}"))
            .andExpect(status().isCreated());

        Integer sameIp = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `Review` WHERE itemId = 3004 AND reviewerId = 1004",
            Integer.class);
        assertThat(sameIp).isEqualTo(1);

        mvc.perform(post("/api/reviews/submit")
                .header("X-Real-IP", "8.8.8.8")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":3}"))
            .andExpect(status().isCreated());

        Integer distinctIps = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `Review` WHERE itemId = 3004 AND reviewerId = 1004",
            Integer.class);
        assertThat(distinctIps).isEqualTo(2);

        mvc.perform(post("/api/reviews/submit")
                .header("X-Real-IP", "7.7.7.7")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":3,\"comment\":\"游客评论\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("游客仅允许评分，请登录后发表文字评论"));
    }

    @Test
    void within_24h_updates_existing_without_experience() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3001,\"rating\":1}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(4001))
            .andExpect(jsonPath("$.status").value("APPROVED"));

        assertThat(experience(1001)).isEqualTo(120);
        assertThat(avg(3001)).isEqualTo(1.0);
    }

    @Test
    void outside_24h_creates_new_review_and_adds_experience() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3002,\"rating\":5}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());

        assertThat(experience(1001)).isEqualTo(125);
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `Review` WHERE itemId = 3002 AND reviewerId = 1001",
            Integer.class);
        assertThat(count).isEqualTo(3);
    }

    @Test
    void pending_review_is_not_counted_in_average() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3001,\"rating\":5,\"comment\":\"文字评价\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"));

        assertThat(avg(3001)).isEqualTo(1.0);
    }

    @Test
    void clearing_image_in_window_prevents_moderation_bypass() throws Exception {
        jdbc.update("UPDATE `Review` SET imageUrl = 'assets/reviews/old.png' WHERE id = 4002");
        String token = login("bob", "Password123");

        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3001,\"rating\":1,\"imageUrl\":\"\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("APPROVED"));

        String image = jdbc.queryForObject(
            "SELECT imageUrl FROM `Review` WHERE id = 4002", String.class);
        assertThat(image).isNull();
    }

    @Test
    void rejects_missing_fields_and_sensitive_comment() throws Exception {
        mvc.perform(post("/api/reviews/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("项目 ID 和评分均为必填项"));

        String token = login("alice", "Password123");
        mvc.perform(post("/api/reviews/submit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemId\":3004,\"rating\":5,\"comment\":\"傻逼\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("评价内容包含敏感词，请修改后再提交"));
    }

    private int experience(int userId) {
        return jdbc.queryForObject(
            "SELECT experience FROM `User` WHERE id = ?", Integer.class, userId);
    }

    private double avg(int itemId) {
        return jdbc.queryForObject(
            "SELECT avgRating FROM `ReviewableItem` WHERE id = ?", Double.class, itemId);
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
