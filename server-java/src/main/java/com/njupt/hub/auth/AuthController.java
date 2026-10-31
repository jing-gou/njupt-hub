package com.njupt.hub.auth;

import java.util.Map;

import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.token.JwtPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ClientIpResolver ipResolver;

    public AuthController(AuthService authService, ClientIpResolver ipResolver) {
        this.authService = authService;
        this.ipResolver = ipResolver;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
        @RequestBody(required = false) RegisterRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("message", "注册成功", "user", authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
        @RequestBody(required = false) LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        LoginResult result = authService.login(
            request == null ? null : request.username(),
            request == null ? null : request.password(),
            httpRequest);
        return ResponseEntity.ok(Map.of("token", result.token(), "user", result.user()));
    }

    @PostMapping("/send-verification-code")
    public ResponseEntity<Map<String, String>> sendVerificationCode(
        @RequestBody(required = false) SendCodeRequest request,
        HttpServletRequest httpRequest
    ) {
        authService.sendVerificationCode(
            request == null ? null : request.email(),
            ipResolver.resolve(httpRequest));
        return ResponseEntity.ok(Map.of("message", "验证码已发送"));
    }

    @PostMapping("/send-reset-password-code")
    public ResponseEntity<Map<String, String>> sendResetPasswordCode(
        @RequestBody(required = false) SendCodeRequest request,
        HttpServletRequest httpRequest
    ) {
        authService.sendResetPasswordCode(
            request == null ? null : request.email(),
            ipResolver.resolve(httpRequest));
        return ResponseEntity.ok(Map.of("message", "重置码已发送"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
        @RequestBody(required = false) ResetPasswordRequest request
    ) {
        authService.resetPassword(
            request == null ? null : request.email(),
            request == null ? null : request.code(),
            request == null ? null : request.newPassword());
        return ResponseEntity.ok(Map.of("message", "密码重置成功"));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> leaderboard() {
        return ResponseEntity.ok(Map.of("items", authService.leaderboard()));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(Map.of("user", authService.getMe(principal.userId())));
    }

    @PatchMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) UpdateProfileRequest request
    ) {
        ProfileResult result = authService.updateProfile(
            principal.userId(),
            request == null ? null : request.username());
        return ResponseEntity.ok(Map.of(
            "message", "资料更新成功",
            "token", result.token(),
            "user", result.user()));
    }

    @PatchMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
        @AuthenticationPrincipal JwtPrincipal principal,
        @RequestBody(required = false) ChangePasswordRequest request
    ) {
        authService.changePassword(
            principal.userId(),
            request == null ? null : request.currentPassword(),
            request == null ? null : request.newPassword());
        return ResponseEntity.ok(Map.of("message", "密码修改成功"));
    }
}
