package com.njupt.hub.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.rate-limit")
public record RateLimitProperties(
    int loginLimit,
    Duration loginWindow,
    int codeLimit,
    Duration codeWindow,
    int codeMaxAttempts
) {
}
