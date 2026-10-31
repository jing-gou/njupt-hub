package com.njupt.hub.support;

import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.common.web.RequestIdFilter;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
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
}
