package com.njupt.hub.support;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class RedisSmokeTest extends FullStackTestBase {

    @Autowired
    StringRedisTemplate redis;

    @Test
    void redis_is_reachable() {
        redis.opsForValue().set("smoke:key", "ok");
        assertThat(redis.opsForValue().get("smoke:key")).isEqualTo("ok");
    }
}
