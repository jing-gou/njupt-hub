package com.njupt.hub.auth;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class AuthProtectedTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql"));
    }

    @Test
    void password_change_revokes_old_token() throws Exception {
        String oldToken = login("alice", "Password123");

        mvc.perform(patch("/api/auth/password")
                .header("Authorization", "Bearer " + oldToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Password123\",\"newPassword\":\"NewPassword123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("密码修改成功"));

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("无效的令牌"));

        String newToken = login("alice", "NewPassword123");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + newToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.username").value("alice"));
    }

    @Test
    void profile_update_returns_working_token() throws Exception {
        String token = login("alice", "Password123");

        MvcResult result = mvc.perform(patch("/api/auth/profile")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newuser\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.username").value("newuser"))
            .andReturn();

        String nextToken = mapper.readTree(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + nextToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.username").value("newuser"));
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(
                    java.util.Map.of("username", username, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();
    }
}
