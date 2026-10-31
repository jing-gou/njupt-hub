package com.njupt.hub.auth.code;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;

import com.njupt.hub.auth.config.RateLimitProperties;
import com.njupt.hub.auth.config.VerificationCodeProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class VerificationCodeStore {

    private final StringRedisTemplate redis;
    private final RateLimitProperties properties;
    private final VerificationCodeProperties codeProperties;

    public VerificationCodeStore(
        StringRedisTemplate redis,
        RateLimitProperties properties,
        VerificationCodeProperties codeProperties
    ) {
        this.redis = redis;
        this.properties = properties;
        this.codeProperties = codeProperties;
    }

    public void save(CodeType type, String email, String code) {
        String key = codeKey(type, email);
        Duration ttl = codeProperties.effectiveTtl();
        long expiresAt = Instant.now().plus(ttl).toEpochMilli();

        redis.opsForHash().putAll(key, Map.of(
            "code", code,
            "expiresAt", Long.toString(expiresAt)));
        redis.expire(key, codeProperties.effectiveCacheTtl());
        redis.delete(attemptsKey(type, email));
    }

    public VerifyResult verify(CodeType type, String email, String code) {
        return verify(type, email, code, true);
    }

    public VerifyResult verify(CodeType type, String email, String code, boolean consumeOnSuccess) {
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
                redis.expire(attemptsKey(type, email), codeProperties.effectiveCacheTtl());
            }
            if (attempts != null && attempts >= properties.codeMaxAttempts()) {
                delete(type, email);
                return VerifyResult.TOO_MANY;
            }
            return VerifyResult.INVALID;
        }

        if (consumeOnSuccess) {
            delete(type, email);
        }
        return VerifyResult.OK;
    }

    public void delete(CodeType type, String email) {
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
