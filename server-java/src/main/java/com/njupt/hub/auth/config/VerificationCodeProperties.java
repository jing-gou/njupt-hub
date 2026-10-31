package com.njupt.hub.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.code")
public record VerificationCodeProperties(Duration ttl, Duration cacheTtl) {

    public Duration effectiveTtl() {
        return ttl == null ? Duration.ofMinutes(5) : ttl;
    }

    public Duration effectiveCacheTtl() {
        return cacheTtl == null ? Duration.ofMinutes(6) : cacheTtl;
    }
}
