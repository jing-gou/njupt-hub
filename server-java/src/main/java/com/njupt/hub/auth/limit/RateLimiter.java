package com.njupt.hub.auth.limit;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);
    private static final int LOCAL_CACHE_LIMIT = 10_000;

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
    private final ConcurrentHashMap<String, LocalWindow> localWindows = new ConcurrentHashMap<>();

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
            log.warn("Redis unavailable while rate limiting {}, using in-memory fallback", key);
            return localTryAcquire(key, limit, window);
        }
    }

    private boolean localTryAcquire(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        LocalWindow current = localWindows.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.startedAt() >= window.toMillis()) {
                return new LocalWindow(now, new AtomicInteger(1));
            }
            existing.count().incrementAndGet();
            return existing;
        });

        if (localWindows.size() > LOCAL_CACHE_LIMIT) {
            localWindows.clear();
        }
        return current.count().get() <= limit;
    }

    private record LocalWindow(long startedAt, AtomicInteger count) {
    }
}
