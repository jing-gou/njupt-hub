package com.njupt.hub.auth.security;

import java.util.UUID;

import com.njupt.hub.auth.token.JwtService;
import com.njupt.hub.auth.token.SessionService;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SecurityTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    JwtService jwt;

    @Autowired
    SessionService sessions;

    @Autowired
    StringRedisTemplate redis;

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void health_is_public() throws Exception {
        mvc.perform(get("/health"))
            .andExpect(status().isOk());
    }

    @Test
    void protected_endpoint_without_token_returns_401() throws Exception {
        mvc.perform(get("/test/protected"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("未提供令牌"));
    }

    @Test
    void non_bearer_header_returns_missing_token_message() throws Exception {
        mvc.perform(get("/test/protected").header("Authorization", "Basic x"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("未提供令牌"));
    }

    @Test
    void invalid_token_returns_invalid_message() throws Exception {
        mvc.perform(get("/test/protected").header("Authorization", "Bearer not-a-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("无效的令牌"));
    }

    @Test
    void valid_token_reaches_protected_endpoint() throws Exception {
        String jti = UUID.randomUUID().toString();
        sessions.create(1L, jti);
        String token = jwt.issue(1L, "USER", "alice", jti);

        mvc.perform(get("/test/protected").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(1));
    }

    @Test
    void user_cannot_access_admin_endpoint() throws Exception {
        String jti = UUID.randomUUID().toString();
        sessions.create(1L, jti);
        String token = jwt.issue(1L, "USER", "alice", jti);

        mvc.perform(get("/test/admin").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("拒绝访问"));
    }

    @Test
    void admin_can_access_admin_endpoint() throws Exception {
        String jti = UUID.randomUUID().toString();
        sessions.create(1L, jti);
        String token = jwt.issue(1L, "ADMIN", "admin", jti);

        mvc.perform(get("/test/admin").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
}
