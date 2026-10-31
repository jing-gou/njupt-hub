package com.njupt.hub.common;

import com.njupt.hub.common.api.GlobalExceptionHandler;
import com.njupt.hub.common.web.RequestIdFilter;
import com.njupt.hub.support.TestErrorController;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TestErrorController.class)
@Import(GlobalExceptionHandler.class)
@ExtendWith(OutputCaptureExtension.class)
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

    @Test
    void requestId_appearsInLogs(CapturedOutput output) throws Exception {
        mvc.perform(get("/test/boom").header(RequestIdFilter.REQUEST_ID_HEADER, "req-log-1"));

        assertThat(output.getOut()).contains("req-log-1");
    }

    @Test
    void unknownPath_returns404() throws Exception {
        mvc.perform(get("/test/does-not-exist"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void unsupportedMethod_returns405() throws Exception {
        mvc.perform(post("/test/api-error"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.error").value("Method Not Allowed"));
    }

    @Test
    void malformedJson_returns400() throws Exception {
        mvc.perform(post("/test/echo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{broken"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("请求体格式错误"));
    }

    @Test
    void validationFailure_returns400WithMessage() throws Exception {
        mvc.perform(post("/test/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("name 不能为空"));
    }

    @Test
    void echo_returnsRequestBody() throws Exception {
        mvc.perform(post("/test/echo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"njupt\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.received.name").value("njupt"));
    }
}
