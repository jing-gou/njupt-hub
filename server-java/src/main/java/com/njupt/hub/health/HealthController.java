package com.njupt.hub.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    public record HealthResponse(String status, String message) {
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", "服务器运行正常");
    }
}
