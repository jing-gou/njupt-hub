package com.njupt.hub.auth.limit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
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

        String remote = request.getRemoteAddr();
        return isIp(remote) ? remote : "unknown";
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
