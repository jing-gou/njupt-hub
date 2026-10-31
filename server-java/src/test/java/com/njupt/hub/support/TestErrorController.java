package com.njupt.hub.support;

import java.util.Map;

import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.common.web.RequestIdFilter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
public class TestErrorController {

    private static volatile String lastMdcRequestId;

    public static String lastMdcRequestId() {
        return lastMdcRequestId;
    }

    @GetMapping("/api-error")
    public void apiError() {
        throw new ApiException(HttpStatus.BAD_REQUEST, "标题不能为空");
    }

    @GetMapping("/boom")
    public void boom() {
        lastMdcRequestId = MDC.get(RequestIdFilter.MDC_KEY);
        throw new IllegalStateException("database password leaked here");
    }

    @PostMapping("/echo")
    public Map<String, Object> echo(@RequestBody Map<String, Object> body) {
        return Map.of("received", body);
    }

    @PostMapping("/validate")
    public void validate(@Valid @RequestBody Payload payload) {
    }

    public record Payload(@NotBlank(message = "name 不能为空") String name) {
    }
}
