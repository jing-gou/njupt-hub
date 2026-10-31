package com.njupt.hub.auth.token;

import java.util.UUID;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class SessionServiceTest extends FullStackTestBase {

    @Autowired
    SessionService sessions;

    @Autowired
    StringRedisTemplate redis;

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void creates_checks_and_revokes_sessions() {
        long userId = 42L;
        String jti = UUID.randomUUID().toString();

        assertThat(sessions.create(userId, jti)).isTrue();
        assertThat(sessions.isActive(userId, jti)).isTrue();
        assertThat(sessions.isActive(99L, jti)).isFalse();

        sessions.revokeAll(userId);

        assertThat(sessions.isActive(userId, jti)).isFalse();
    }
}
