package com.njupt.hub.auth;

import com.njupt.hub.auth.limit.RateLimiter;
import com.njupt.hub.auth.security.JwtAuthenticationFilter;
import com.njupt.hub.auth.token.JwtPrincipal;
import com.njupt.hub.auth.token.JwtService;
import com.njupt.hub.auth.token.SessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthFailureModeTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rate_limiter_fails_open() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.execute(any(), anyList(), any()))
            .thenThrow(new DataAccessResourceFailureException("redis down"));

        RateLimiter limiter = new RateLimiter(redis);
        Duration window = Duration.ofMinutes(1);

        assertThat(limiter.tryAcquire("login", "ip|alice", 1, window)).isTrue();
        assertThat(limiter.tryAcquire("login", "ip|alice", 1, window)).isFalse();
        assertThat(limiter.tryAcquire("login", "ip|bob", 1, window)).isTrue();
    }

    @Test
    void auth_filter_fails_open_when_session_lookup_fails() throws Exception {
        JwtService jwt = mock(JwtService.class);
        SessionService sessions = mock(SessionService.class);
        when(jwt.parse("token")).thenReturn(new JwtPrincipal(1L, "USER", "alice", "jti", false));
        when(sessions.isActive(1L, "jti"))
            .thenThrow(new DataAccessResourceFailureException("redis down"));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, sessions);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test/protected");
        request.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
            .isEqualTo("alice");
    }
}
