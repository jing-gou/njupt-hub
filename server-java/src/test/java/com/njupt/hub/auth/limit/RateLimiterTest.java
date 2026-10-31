package com.njupt.hub.auth.limit;

import java.time.Duration;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterTest extends FullStackTestBase {

    @Autowired
    RateLimiter limiter;

    @Autowired
    StringRedisTemplate redis;

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void allows_up_to_limit_and_rejects_after() {
        Duration window = Duration.ofMinutes(1);

        assertThat(limiter.tryAcquire("login", "1.2.3.4|alice", 2, window)).isTrue();
        assertThat(limiter.tryAcquire("login", "1.2.3.4|alice", 2, window)).isTrue();
        assertThat(limiter.tryAcquire("login", "1.2.3.4|alice", 2, window)).isFalse();
        assertThat(limiter.tryAcquire("login", "5.6.7.8|alice", 2, window)).isTrue();
    }
}
