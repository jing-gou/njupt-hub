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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ReviewItemTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        seeder.apply(List.of("users.sql", "reviews.sql"));
    }

    @Test
    void lists_items_with_latest_approved_review_and_count() throws Exception {
        mvc.perform(get("/api/reviews/items"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].reviewCount").value(2))
            .andExpect(jsonPath("$[0].avgRating").value(4.5))
            .andExpect(jsonPath("$[0].imageUrl")
                .value("https://kodo.test/assets/items/mentor.png"))
            .andExpect(jsonPath("$[0].reviews[0].id").value(4001))
            .andExpect(jsonPath("$[0].reviews[0].reviewer.username").value("alice"));

        mvc.perform(get("/api/reviews/items").param("type", "MENTOR"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void detail_includes_likes_replies_and_all_review_count() throws Exception {
        mvc.perform(get("/api/reviews/items/3001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reviewCount").value(3))
            .andExpect(jsonPath("$.reviews.length()").value(2))
            .andExpect(jsonPath("$.reviews[0].id").value(4001))
            .andExpect(jsonPath("$.reviews[0].likesCount").value(2))
            .andExpect(jsonPath("$.reviews[0].replies[0].user.username").value("bob"))
            .andExpect(jsonPath("$.reviews[0].isLiked").value(false));
    }

    @Test
    void detail_shows_own_pending_review_and_liked_state() throws Exception {
        String token = login("bob", "Password123");

        mvc.perform(get("/api/reviews/items/3001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reviews.length()").value(3))
            .andExpect(jsonPath("$.reviews[0].id").value(4001))
            .andExpect(jsonPath("$.reviews[0].isLiked").value(true))
            .andExpect(jsonPath("$.reviews[1].id").value(4002))
            .andExpect(jsonPath("$.reviews[1].status").value("PENDING"));
    }

    @Test
    void detail_returns_404_for_missing_item() throws Exception {
        mvc.perform(get("/api/reviews/items/999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("项目未找到"));
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(
                    java.util.Map.of("username", username, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();
    }
}
