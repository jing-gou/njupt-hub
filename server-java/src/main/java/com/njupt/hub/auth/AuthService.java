package com.njupt.hub.auth;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import com.njupt.hub.auth.code.CodeType;
import com.njupt.hub.auth.code.VerificationCodeService;
import com.njupt.hub.auth.code.VerifyResult;
import com.njupt.hub.auth.config.RateLimitProperties;
import com.njupt.hub.auth.limit.ClientIpResolver;
import com.njupt.hub.auth.limit.RateLimiter;
import com.njupt.hub.auth.token.JwtService;
import com.njupt.hub.auth.token.SessionService;
import com.njupt.hub.auth.user.ExperienceCalculator;
import com.njupt.hub.auth.user.LeaderboardItem;
import com.njupt.hub.auth.user.User;
import com.njupt.hub.auth.user.UserMapper;
import com.njupt.hub.auth.user.UserView;
import com.njupt.hub.common.api.ApiException;
import com.njupt.hub.sensitive.SensitiveWordFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
    private static final String PASSWORD_PATTERN = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$";

    private final UserMapper users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SessionService sessions;
    private final VerificationCodeService codes;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver ipResolver;
    private final SensitiveWordFilter sensitiveWords;
    private final QiniuUrlSigner urlSigner;
    private final RateLimitProperties rateLimits;

    public AuthService(
        UserMapper users,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        SessionService sessions,
        VerificationCodeService codes,
        RateLimiter rateLimiter,
        ClientIpResolver ipResolver,
        SensitiveWordFilter sensitiveWords,
        QiniuUrlSigner urlSigner,
        RateLimitProperties rateLimits
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.sessions = sessions;
        this.codes = codes;
        this.rateLimiter = rateLimiter;
        this.ipResolver = ipResolver;
        this.sensitiveWords = sensitiveWords;
        this.urlSigner = urlSigner;
        this.rateLimits = rateLimits;
    }

    public void sendVerificationCode(String email, String ip) {
        if (isBlank(email)) {
            throw badRequest("邮箱是必填项");
        }
        if (!email.matches(EMAIL_PATTERN)) {
            throw badRequest("邮箱格式不正确");
        }
        if (findByEmail(email) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "邮箱已被注册");
        }

        checkRate("send-code", ip + "|" + email.toLowerCase(Locale.ROOT),
            rateLimits.codeLimit(), rateLimits.codeWindow());
        codes.send(CodeType.VERIFICATION, email);
    }

    @Transactional
    public UserView register(RegisterRequest request) {
        String username = request == null ? null : request.username();
        String password = request == null ? null : request.password();
        String email = request == null ? null : request.email();
        String code = request == null ? null : request.code();

        if (isBlank(username) || isBlank(password) || isBlank(email) || isBlank(code)) {
            throw badRequest("用户名、密码、邮箱和验证码均为必填项");
        }

        String normalizedUsername = username.trim();
        if (sensitiveWords.contains(normalizedUsername)) {
            throw badRequest("用户名包含敏感词，请修改后重试");
        }

        verifyCode(CodeType.VERIFICATION, email, code, true);

        if (!email.matches(EMAIL_PATTERN)) {
            throw badRequest("邮箱格式不正确");
        }
        if (!password.matches(PASSWORD_PATTERN)) {
            throw badRequest("密码必须至少为8位，且包含字母和数字");
        }
        if (findByUsername(normalizedUsername) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "用户名已存在");
        }
        if (findByEmail(email) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "邮箱已被注册");
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setRole("USER");
        user.setExperience(0);
        users.insert(user);

        return ExperienceCalculator.toView(user, urlSigner);
    }

    public LoginResult login(String username, String password, HttpServletRequest request) {
        if (isBlank(username) || isBlank(password)) {
            throw badRequest("用户名和密码均为必填项");
        }

        String ip = ipResolver.resolve(request);
        checkRate("login", ip + "|" + username.toLowerCase(Locale.ROOT),
            rateLimits.loginLimit(), rateLimits.loginWindow());

        User user = findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        }

        String jti = UUID.randomUUID().toString();
        boolean sessionCreated = sessions.create(user.getId(), jti);
        String token = jwtService.issue(
            user.getId(),
            user.getRole() == null ? "USER" : user.getRole(),
            user.getUsername(),
            sessionCreated ? jti : null);

        return new LoginResult(token, ExperienceCalculator.toView(user, urlSigner));
    }

    public UserView getMe(long userId) {
        User user = users.selectById(userId);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }
        return ExperienceCalculator.toView(user, urlSigner);
    }

    @Transactional
    public ProfileResult updateProfile(long userId, String username) {
        String nextUsername = username == null ? "" : username.trim();
        if (nextUsername.isEmpty()) {
            throw badRequest("用户名不能为空");
        }
        if (sensitiveWords.contains(nextUsername)) {
            throw badRequest("用户名包含敏感词，请修改后重试");
        }

        User existing = users.selectOne(new LambdaQueryWrapper<User>()
            .eq(User::getUsername, nextUsername)
            .ne(User::getId, userId));
        if (existing != null) {
            throw new ApiException(HttpStatus.CONFLICT, "用户名已存在");
        }

        User user = users.selectById(userId);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }
        user.setUsername(nextUsername);
        users.updateById(user);

        String jti = UUID.randomUUID().toString();
        boolean sessionCreated = sessions.create(user.getId(), jti);
        String token = jwtService.issue(
            user.getId(),
            user.getRole() == null ? "USER" : user.getRole(),
            user.getUsername(),
            sessionCreated ? jti : null);

        return new ProfileResult(token, ExperienceCalculator.toView(user, urlSigner));
    }

    @Transactional
    public void changePassword(long userId, String currentPassword, String newPassword) {
        if (isBlank(currentPassword) || isBlank(newPassword)) {
            throw badRequest("当前密码和新密码均为必填项");
        }
        if (!newPassword.matches(PASSWORD_PATTERN)) {
            throw badRequest("密码必须至少为8位，且包含字母和数字");
        }

        User user = users.selectById(userId);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw badRequest("当前密码错误");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        users.updateById(user);
        sessions.revokeAll(userId);
    }

    public List<LeaderboardItem> leaderboard() {
        List<User> usersList = users.selectList(new LambdaQueryWrapper<User>()
            .ne(User::getUsername, "游客")
            .orderByDesc(User::getExperience)
            .orderByAsc(User::getCreatedAt)
            .last("LIMIT 20"));

        List<LeaderboardItem> items = new ArrayList<>();
        for (int index = 0; index < usersList.size(); index++) {
            items.add(ExperienceCalculator.toLeaderboard(usersList.get(index), index + 1, urlSigner));
        }
        return items;
    }

    public void sendResetPasswordCode(String email, String ip) {
        if (isBlank(email)) {
            throw badRequest("邮箱是必填项");
        }
        User user = findByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }

        checkRate("reset-code", ip + "|" + email.toLowerCase(Locale.ROOT),
            rateLimits.codeLimit(), rateLimits.codeWindow());
        codes.send(CodeType.RESET, email);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        if (isBlank(email) || isBlank(code) || isBlank(newPassword)) {
            throw badRequest("邮箱、重置码和新密码均为必填项");
        }

        verifyCode(CodeType.RESET, email, code, false);
        if (!newPassword.matches(PASSWORD_PATTERN)) {
            throw badRequest("密码必须至少为8位，且包含字母和数字");
        }

        User user = findByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "用户不存在");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        users.updateById(user);
        sessions.revokeAll(user.getId());
        codes.consume(CodeType.RESET, email);
    }

    private void verifyCode(CodeType type, String email, String code, boolean consumeOnSuccess) {
        VerifyResult result = codes.verify(type, email, code, consumeOnSuccess);
        switch (result) {
            case OK -> {
            }
            case INVALID -> throw badRequest("验证码不正确");
            case EXPIRED -> throw badRequest("验证码已过期");
            case TOO_MANY -> throw badRequest("验证码错误次数过多，请重新获取");
        }
    }

    private void checkRate(String bucket, String subject, int limit, Duration window) {
        if (!rateLimiter.tryAcquire(bucket, subject, limit, window)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
        }
    }

    private User findByEmail(String email) {
        return users.selectOne(new LambdaQueryWrapper<User>().eq(User::getEmail, email));
    }

    private User findByUsername(String username) {
        return users.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
