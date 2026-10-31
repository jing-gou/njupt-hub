package com.njupt.hub.auth.limit;

import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private static final String SCRIPT = """
        local current = redis.call('INCR', KEYS[1])
        if current == 1 or redis.call('PTTL', KEYS[1]) < 0 then
          redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        return current
        """;

    private static final DefaultRedisScript<Long> INCREMENT_SCRIPT =
        new DefaultRedisScript<>(SCRIPT, Long.class);

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean tryAcquire(String bucket, String subject, int limit, Duration window) {
        String key = "rl:" + bucket + ":" + subject;
        try {
            Long count = redis.execute(INCREMENT_SCRIPT, List.of(key),
                Long.toString(window.toMillis()));
            return count == null || count <= limit;
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while rate limiting {}, allow request", key, ex);
            return true;
        }
    }
}
