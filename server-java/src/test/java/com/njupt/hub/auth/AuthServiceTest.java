package com.njupt.hub.auth;

import java.time.Duration;

import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.code.CodeType;
import com.njupt.hub.auth.code.VerificationCodeService;
import com.njupt.hub.auth.code.VerifyResult;
import com.njupt.hub.auth.config.RateLimitProperties;
import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.limit.RateLimiter;
import com.njupt.hub.auth.mail.MailService;
import com.njupt.hub.auth.token.JwtService;
import com.njupt.hub.auth.token.SessionService;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.sensitive.SensitiveWordFilter;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UserMapper users = mock(UserMapper.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);
    private final SessionService sessions = mock(SessionService.class);
    private final VerificationCodeService codes = mock(VerificationCodeService.class);
    private final RateLimiter limiter = mock(RateLimiter.class);
    private final ClientIpResolver ipResolver = mock(ClientIpResolver.class);
    private final SensitiveWordFilter sensitive = mock(SensitiveWordFilter.class);
    private final MailService mail = mock(MailService.class);
    private final QiniuUrlSigner signer = mock(QiniuUrlSigner.class);

    private final AuthService service = new AuthService(
        users, encoder, jwt, sessions, codes, limiter, ipResolver, sensitive, mail, signer,
        new RateLimitProperties(10, Duration.ofMinutes(15), 5, Duration.ofMinutes(15), 5));

    @Test
    void register_rejects_weak_password() {
        when(codes.verify(CodeType.VERIFICATION, "a@b.com", "123456"))
            .thenReturn(VerifyResult.OK);
        when(sensitive.contains("alice")).thenReturn(false);
        when(users.selectOne(any())).thenReturn(null);

        assertThatThrownBy(() -> service.register(
            new RegisterRequest("alice", "weak", "a@b.com", "123456")))
            .isInstanceOf(ApiException.class)
            .hasMessage("密码必须至少为8位，且包含字母和数字");
    }

    @Test
    void register_rejects_sensitive_username() {
        when(sensitive.contains("badword")).thenReturn(true);

        assertThatThrownBy(() -> service.register(
            new RegisterRequest("badword", "Password123", "a@b.com", "123456")))
            .isInstanceOf(ApiException.class)
            .hasMessage("用户名包含敏感词，请修改后重试");
    }

    @Test
    void login_rejects_wrong_password() {
        User user = user(1, "alice", "hash");
        when(users.selectOne(any())).thenReturn(user);
        when(encoder.matches("wrong", "hash")).thenReturn(false);
        when(ipResolver.resolve(any())).thenReturn("1.2.3.4");
        when(limiter.tryAcquire(any(), any(), any(Integer.class), any(Duration.class)))
            .thenReturn(true);

        assertThatThrownBy(() -> service.login("alice", "wrong", null))
            .isInstanceOf(ApiException.class)
            .hasMessage("用户名或密码错误");
    }

    @Test
    void send_verification_rejects_existing_email() {
        when(users.selectOne(any())).thenReturn(user(1, "alice", "hash"));

        assertThatThrownBy(() -> service.sendVerificationCode("alice@example.com", "1.2.3.4"))
            .isInstanceOf(ApiException.class)
            .hasMessage("邮箱已被注册");
    }

    @Test
    void register_success_hashes_password_and_returns_view() {
        when(codes.verify(CodeType.VERIFICATION, "new@example.com", "123456"))
            .thenReturn(VerifyResult.OK);
        when(sensitive.contains("newuser")).thenReturn(false);
        when(users.selectOne(any())).thenReturn(null);
        when(encoder.encode("Password123")).thenReturn("hashed");
        when(signer.getSignedUrl(null)).thenReturn("");
        doAnswer(invocation -> {
            invocation.getArgument(0, User.class).setId(10);
            return 1;
        }).when(users).insert(any(User.class));

        var view = service.register(
            new RegisterRequest("newuser", "Password123", "new@example.com", "123456"));

        assertThat(view.username()).isEqualTo("newuser");
        assertThat(view.email()).isEqualTo("new@example.com");
        assertThat(view.role()).isEqualTo("USER");
        assertThat(view.experience()).isZero();
        assertThat(view.level()).isEqualTo(1);
    }

    private User user(int id, String username, String password) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setPassword(password);
        user.setEmail(username + "@example.com");
        user.setRole("USER");
        user.setExperience(0);
        return user;
    }
}
