package com.njupt.hub.auth.code;

import java.time.Duration;

import com.njupt.hub.auth.mail.CodeMailSender;
import com.njupt.hub.common.api.ApiException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VerificationCodeServiceTest {

    private final VerificationCodeStore store = mock(VerificationCodeStore.class);
    private final CodeMailSender mail = mock(CodeMailSender.class);
    private final VerificationCodeService service = new VerificationCodeService(store, mail);

    @Test
    void send_stores_six_digit_code_and_mails_it() {
        service.send(CodeType.VERIFICATION, "alice@example.com");

        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(store).save(eq(CodeType.VERIFICATION), eq("alice@example.com"), code.capture());
        verify(mail).sendVerificationCode("alice@example.com", code.getValue());
        assertThat(code.getValue()).matches("\\d{6}");
    }

    @Test
    void verify_delegates_to_store() {
        when(store.verify(CodeType.RESET, "alice@example.com", "123456", true))
            .thenReturn(VerifyResult.OK);

        assertThat(service.verify(CodeType.RESET, "alice@example.com", "123456"))
            .isEqualTo(VerifyResult.OK);
    }

    @Test
    void redis_failure_is_fail_closed_with_503() {
        when(store.verify(any(), anyString(), anyString(), anyBoolean()))
            .thenThrow(new DataAccessResourceFailureException("redis down"));

        assertThatThrownBy(() -> service.verify(CodeType.VERIFICATION, "a@b.com", "123456"))
            .isInstanceOf(ApiException.class)
            .hasMessage("服务暂时不可用，请稍后重试");
    }

    @Test
    void send_fails_closed_when_redis_is_down() {
        org.mockito.Mockito.doThrow(new DataAccessResourceFailureException("redis down"))
            .when(store).save(any(), anyString(), anyString());

        assertThatThrownBy(() -> service.send(CodeType.VERIFICATION, "a@b.com"))
            .isInstanceOf(ApiException.class)
            .hasMessage("服务暂时不可用，请稍后重试");
    }
}
