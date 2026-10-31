package com.njupt.hub.auth.limit;

import java.util.Arrays;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {

    private final List<IpAddressMatcher> trustedProxies;

    public ClientIpResolver(
        @Value("${app.trusted-proxies:127.0.0.1,::1}") String trustedProxies
    ) {
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .map(IpAddressMatcher::new)
            .toList();
    }

    public String resolve(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (!isIp(remote)) {
            return "unknown";
        }
        if (!isTrustedProxy(remote)) {
            return remote;
        }

        String realIp = request.getHeader("X-Real-IP");
        if (isIp(realIp)) {
            return realIp.trim();
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String first = forwarded.split(",")[0].trim();
            if (isIp(first)) {
                return first;
            }
        }

        return remote;
    }

    private boolean isTrustedProxy(String remote) {
        return trustedProxies.stream().anyMatch(matcher -> matcher.matches(remote));
    }

    private boolean isIp(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String trimmed = value.trim();
        if (trimmed.matches("\\d{1,3}(?:\\.\\d{1,3}){3}")) {
            for (String part : trimmed.split("\\.")) {
                if (Integer.parseInt(part) > 255) {
                    return false;
                }
            }
            return true;
        }
        return trimmed.contains(":") && trimmed.matches("[0-9a-fA-F:.%]+");
    }
}
