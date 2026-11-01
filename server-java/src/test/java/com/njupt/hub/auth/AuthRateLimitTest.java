package com.njupt.hub.auth;

import java.util.List;
import java.util.Map;

import com.njupt.hub.auth.code.VerificationCodeStore;
import com.njupt.hub.auth.mail.SmtpMailService;
import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class AuthRateLimitTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    VerificationCodeStore codeStore;

    @MockitoBean
    SmtpMailService mailService;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql"));
    }

    @Test
    void login_is_rate_limited_per_ip_and_username() throws Exception {
        for (int attempt = 0; attempt < 10; attempt++) {
            mvc.perform(post("/api/auth/login")
                    .header("X-Real-IP", "10.0.0.1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"username\":\"alice\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
        }

        mvc.perform(post("/api/auth/login")
                .header("X-Real-IP", "10.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"alice\",\"password\":\"wrong\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.message").value("请求过于频繁，请稍后再试"));

        mvc.perform(post("/api/auth/login")
                .header("X-Real-IP", "10.0.0.2")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"alice\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void sending_codes_is_rate_limited() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            mvc.perform(post("/api/auth/send-verification-code")
                    .header("X-Real-IP", "10.0.0.3")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"fresh@example.com\"}"))
                .andExpect(status().isOk());
        }

        mvc.perform(post("/api/auth/send-verification-code")
                .header("X-Real-IP", "10.0.0.3")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"fresh@example.com\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.message").value("请求过于频繁，请稍后再试"));
    }

    @Test
    void five_bad_codes_invalidate_the_code() throws Exception {
        codeStore.save(com.njupt.hub.auth.code.CodeType.VERIFICATION,
            "attempt@example.com", "123456");

        for (int attempt = 0; attempt < 4; attempt++) {
            mvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"username":"newuser","password":"Password123",
                         "email":"attempt@example.com","code":"000000"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("验证码不正确"));
        }

        mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"newuser","password":"Password123",
                     "email":"attempt@example.com","code":"000000"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("验证码错误次数过多，请重新获取"));

        mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"newuser","password":"Password123",
                     "email":"attempt@example.com","code":"123456"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("验证码不正确"));
    }
}
