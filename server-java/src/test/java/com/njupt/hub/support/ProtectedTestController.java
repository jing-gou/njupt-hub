package com.njupt.hub.support;

import java.util.Map;

import com.njupt.hub.auth.token.JwtPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
public class ProtectedTestController {

    @GetMapping("/protected")
    public Map<String, Object> protectedEndpoint(@AuthenticationPrincipal JwtPrincipal principal) {
        return Map.of("ok", true, "userId", principal.userId());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> adminEndpoint() {
        return Map.of("ok", true);
    }
}
