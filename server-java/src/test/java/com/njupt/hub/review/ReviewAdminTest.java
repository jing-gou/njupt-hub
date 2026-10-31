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
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ReviewAdminTest extends FullStackTestBase {

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
    void pending_reviews_and_approval_recalculate_average() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(get("/api/reviews/admin/pending-reviews")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(4002))
            .andExpect(jsonPath("$[0].reviewer.username").value("bob"))
            .andExpect(jsonPath("$[0].item.title").value("张老师"));

        mvc.perform(patch("/api/reviews/admin/reviews/4002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("状态更新成功"));

        assertThat(avg(3001)).isCloseTo(4.111111, within(1e-5));
    }

    @Test
    void non_admin_cannot_moderate() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(patch("/api/reviews/admin/reviews/4002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_delete_review_cascades_relations() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(delete("/api/reviews/admin/reviews/4001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("评价已删除"));

        assertThat(count("Like", "reviewId", 4001)).isZero();
        assertThat(count("Reply", "reviewId", 4001)).isZero();
        assertThat(count("Report", "reviewId", 4001)).isZero();
        assertThat(avg(3001)).isEqualTo(1.0);
    }

    @Test
    void reports_list_and_dismiss() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(get("/api/reviews/admin/reports")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].reason").value("内容不实"))
            .andExpect(jsonPath("$[0].review.reviewer.username").value("alice"))
            .andExpect(jsonPath("$[0].review.item.title").value("张老师"));

        mvc.perform(delete("/api/reviews/admin/reports/7001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("举报已撤销"));

        assertThat(count("Report", "id", 7001)).isZero();
    }

    @Test
    void create_update_and_delete_item() throws Exception {
        String admin = login("admin", "Password123");

        MvcResult created = mvc.perform(post("/api/reviews/items")
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"新老师","type":"MENTOR","location":"教二楼","college":"理学院"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.avgRating").value(0.0))
            .andReturn();

        int itemId = mapper.readTree(created.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("id").asInt();

        mvc.perform(patch("/api/reviews/admin/items/" + itemId)
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"新老师改\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("新老师改"));

        mvc.perform(delete("/api/reviews/admin/items/" + itemId)
                .header("Authorization", "Bearer " + admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("项目已删除"));
    }

    @Test
    void invalid_item_payloads_are_rejected() throws Exception {
        String admin = login("admin", "Password123");

        mvc.perform(post("/api/reviews/items")
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\",\"type\":\"BAD\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("无效的类型"));

        mvc.perform(patch("/api/reviews/admin/items/3001")
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("标题不能为空"));
    }

    @Test
    void deleting_item_removes_its_reviews_and_relations() throws Exception {
        String admin = login("admin", "Password123");

        mvc.perform(delete("/api/reviews/admin/items/3001")
                .header("Authorization", "Bearer " + admin))
            .andExpect(status().isOk());

        assertThat(count("Review", "itemId", 3001)).isZero();
        assertThat(count("Like", "reviewId", 4001)).isZero();
        assertThat(count("Reply", "reviewId", 4001)).isZero();
        assertThat(count("Report", "reviewId", 4001)).isZero();
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
