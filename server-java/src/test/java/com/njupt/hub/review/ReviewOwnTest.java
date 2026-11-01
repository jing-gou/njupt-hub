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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ReviewOwnTest extends FullStackTestBase {

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
    void owner_can_update_and_recalculate_average() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(patch("/api/reviews/4001")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":4,\"comment\":\"更新\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(4001))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.message").value("修改已提交，审核通过后公开展示"));

        assertThat(avg(3001)).isEqualTo(1.0);
        assertThat(experience(1001)).isEqualTo(120);
    }

    @Test
    void non_owner_cannot_update_or_delete() throws Exception {
        String token = login("bob", "Password123");

        mvc.perform(patch("/api/reviews/4001")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":4}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("无权修改该评价"));

        mvc.perform(delete("/api/reviews/4001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("无权删除该评价"));
    }

    @Test
    void owner_delete_cascades_relations_and_recalculates() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(delete("/api/reviews/4001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("评价已删除"));

        assertThat(count("Like", "reviewId", 4001)).isZero();
        assertThat(count("Reply", "reviewId", 4001)).isZero();
        assertThat(count("Report", "reviewId", 4001)).isZero();
        assertThat(count("Review", "id", 4001)).isZero();
        assertThat(avg(3001)).isEqualTo(1.0);
    }

    @Test
    void sensitive_comment_and_missing_review_are_rejected() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(patch("/api/reviews/4001")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"傻逼\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("评价内容包含敏感词，请修改后再提交"));

        mvc.perform(patch("/api/reviews/999999")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":4}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("评价不存在"));
    }

    private int count(String table, String column, int value) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM `" + table + "` WHERE `" + column + "` = ?",
            Integer.class, value);
    }

    private double avg(int itemId) {
        return jdbc.queryForObject(
            "SELECT avgRating FROM `ReviewableItem` WHERE id = ?", Double.class, itemId);
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
