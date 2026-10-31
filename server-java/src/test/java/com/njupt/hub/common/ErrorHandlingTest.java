package com.njupt.hub.common;

import com.njupt.hub.common.api.GlobalExceptionHandler;
import com.njupt.hub.common.web.RequestIdFilter;
import com.njupt.hub.support.TestErrorController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TestErrorController.class)
@Import(GlobalExceptionHandler.class)
class ErrorHandlingTest {

    @Autowired
    MockMvc mvc;

    @Test
    void apiException_returnsMessageBody() throws Exception {
        mvc.perform(get("/test/api-error"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("标题不能为空"));
    }

    @Test
    void unexpectedException_hidesInternals() throws Exception {
        mvc.perform(get("/test/boom"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.error").value("服务器内部错误"))
            .andExpect(jsonPath("$.message").doesNotExist());
    }

    @Test
    void requestId_isEchoedAndAvailableInMdc() throws Exception {
        mvc.perform(get("/test/boom").header(RequestIdFilter.REQUEST_ID_HEADER, "req-123"))
            .andExpect(header().string(RequestIdFilter.REQUEST_ID_HEADER, "req-123"));

        assertThat(TestErrorController.lastMdcRequestId()).isEqualTo("req-123");
    }
}
