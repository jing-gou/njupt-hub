package com.njupt.hub.auth.code;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;

import com.njupt.hub.auth.config.RateLimitProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class VerificationCodeStore {

    static final Duration TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;
    private final RateLimitProperties properties;

    public VerificationCodeStore(StringRedisTemplate redis, RateLimitProperties properties) {
        this.redis = redis;
        this.properties = properties;
    }

    public void save(CodeType type, String email, String code) {
        String key = codeKey(type, email);
        long expiresAt = Instant.now().plus(TTL).toEpochMilli();

        redis.opsForHash().putAll(key, Map.of(
            "code", code,
            "expiresAt", Long.toString(expiresAt)));
        redis.expire(key, TTL);
        redis.delete(attemptsKey(type, email));
    }

    public VerifyResult verify(CodeType type, String email, String code) {
        String key = codeKey(type, email);
        Map<Object, Object> stored = redis.opsForHash().entries(key);
        if (stored.isEmpty()) {
            return VerifyResult.INVALID;
        }

        long expiresAt = Long.parseLong(String.valueOf(stored.get("expiresAt")));
        if (Instant.now().toEpochMilli() > expiresAt) {
            delete(type, email);
            return VerifyResult.EXPIRED;
        }

        if (!String.valueOf(stored.get("code")).equals(code)) {
            Long attempts = redis.opsForValue().increment(attemptsKey(type, email));
            if (attempts != null && attempts == 1L) {
                redis.expire(attemptsKey(type, email), TTL);
            }
            if (attempts != null && attempts >= properties.codeMaxAttempts()) {
                delete(type, email);
                return VerifyResult.TOO_MANY;
            }
            return VerifyResult.INVALID;
        }

        delete(type, email);
        return VerifyResult.OK;
    }

    private void delete(CodeType type, String email) {
        redis.delete(codeKey(type, email));
        redis.delete(attemptsKey(type, email));
    }

    public static String codeKey(CodeType type, String email) {
        return "auth:code:" + type.name().toLowerCase(Locale.ROOT) + ":" + email;
    }

    static String attemptsKey(CodeType type, String email) {
        return "auth:code:" + type.name().toLowerCase(Locale.ROOT) + ":attempts:" + email;
    }
}
