package com.njupt.hub.auth.code;

import java.security.SecureRandom;

import com.njupt.hub.auth.mail.MailService;
import com.njupt.hub.common.api.ApiException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class VerificationCodeService {

    private final SecureRandom random = new SecureRandom();
    private final VerificationCodeStore store;
    private final MailService mailService;

    public VerificationCodeService(VerificationCodeStore store, MailService mailService) {
        this.store = store;
        this.mailService = mailService;
    }

    public void send(CodeType type, String email) {
        String code = Integer.toString(100000 + random.nextInt(900000));
        try {
            store.save(type, email, code);
        } catch (DataAccessException ex) {
            throw unavailable();
        }

        if (type == CodeType.VERIFICATION) {
            mailService.sendVerificationCode(email, code);
        } else {
            mailService.sendResetPasswordCode(email, code);
        }
    }

    public VerifyResult verify(CodeType type, String email, String code) {
        try {
            return store.verify(type, email, code);
        } catch (DataAccessException ex) {
            throw unavailable();
        }
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "服务暂时不可用，请稍后重试");
    }
}
