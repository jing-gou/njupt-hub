package com.njupt.hub.auth.code;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class VerificationCodeStoreTest extends FullStackTestBase {

    @Autowired
    VerificationCodeStore store;

    @Autowired
    StringRedisTemplate redis;

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void verifies_once_then_invalid() {
        store.save(CodeType.VERIFICATION, "alice@example.com", "123456");

        assertThat(store.verify(CodeType.VERIFICATION, "alice@example.com", "123456"))
            .isEqualTo(VerifyResult.OK);
        assertThat(store.verify(CodeType.VERIFICATION, "alice@example.com", "123456"))
            .isEqualTo(VerifyResult.INVALID);
    }

    @Test
    void locks_after_five_wrong_attempts() {
        store.save(CodeType.VERIFICATION, "alice@example.com", "123456");

        for (int i = 0; i < 4; i++) {
            assertThat(store.verify(CodeType.VERIFICATION, "alice@example.com", "000000"))
                .isEqualTo(VerifyResult.INVALID);
        }
        assertThat(store.verify(CodeType.VERIFICATION, "alice@example.com", "000000"))
            .isEqualTo(VerifyResult.TOO_MANY);
        assertThat(store.verify(CodeType.VERIFICATION, "alice@example.com", "123456"))
            .isEqualTo(VerifyResult.INVALID);
    }

    @Test
    void reports_expired_code() {
        store.save(CodeType.RESET, "alice@example.com", "123456");
        redis.opsForHash().put(
            VerificationCodeStore.codeKey(CodeType.RESET, "alice@example.com"),
            "expiresAt", "1");

        assertThat(store.verify(CodeType.RESET, "alice@example.com", "123456"))
            .isEqualTo(VerifyResult.EXPIRED);
    }
}
