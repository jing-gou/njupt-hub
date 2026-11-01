package com.njupt.hub.auth;

import com.njupt.hub.auth.code.CodeType;
import com.njupt.hub.auth.code.VerificationCodeStore;
import com.njupt.hub.auth.mail.SmtpMailService;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthMailFailureTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    StringRedisTemplate redis;

    @MockitoBean
    SmtpMailService mailService;

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void mail_failure_returns_generic_500_and_keeps_code() throws Exception {
        doThrow(new IllegalStateException("smtp down"))
            .when(mailService).sendVerificationCode(anyString(), anyString());

        mvc.perform(post("/api/auth/send-verification-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"mailfail@example.com\"}"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.error").value("服务器内部错误"));

        Boolean stored = redis.hasKey(
            VerificationCodeStore.codeKey(CodeType.VERIFICATION, "mailfail@example.com"));
        org.assertj.core.api.Assertions.assertThat(stored).isTrue();
    }
}
