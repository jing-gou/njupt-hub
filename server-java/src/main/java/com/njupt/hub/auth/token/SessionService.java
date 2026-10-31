package com.njupt.hub.auth.token;

import java.time.Duration;
import java.util.Set;

import com.njupt.hub.auth.config.JwtProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    private final StringRedisTemplate redis;
    private final Duration ttl;

    public SessionService(StringRedisTemplate redis, JwtProperties properties) {
        this.redis = redis;
        this.ttl = properties.ttl() == null ? Duration.ofDays(7) : properties.ttl();
    }

    public boolean create(long userId, String jti, Duration sessionTtl) {
        try {
            redis.opsForValue().set(sessionKey(jti), Long.toString(userId), sessionTtl);
            String userSessions = userSessionsKey(userId);
            redis.opsForSet().add(userSessions, jti);
            redis.expire(userSessions, sessionTtl);
            return true;
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while creating session for user {}", userId, ex);
            return false;
        }
    }

    public boolean create(long userId, String jti) {
        return create(userId, jti, ttl);
    }

    public boolean isActive(long userId, String jti) {
        String stored = redis.opsForValue().get(sessionKey(jti));
        return stored != null && stored.equals(Long.toString(userId));
    }

    public void revokeAll(long userId) {
        try {
            Set<String> jtis = redis.opsForSet().members(userSessionsKey(userId));
            if (jtis != null) {
                for (String jti : jtis) {
                    redis.delete(sessionKey(jti));
                }
            }
            redis.delete(userSessionsKey(userId));
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while revoking sessions for user {}", userId, ex);
        }
    }

    public static String sessionKey(String jti) {
        return "auth:sess:" + jti;
    }

    public static String userSessionsKey(long userId) {
        return "auth:user:" + userId + ":sessions";
    }
}
