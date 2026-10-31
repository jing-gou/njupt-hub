package com.njupt.hub.auth.security;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.njupt.hub.auth.token.JwtPrincipal;
import com.njupt.hub.auth.token.JwtService;
import com.njupt.hub.auth.token.SessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTH_ERROR_ATTRIBUTE = "authError";

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final SessionService sessionService;

    public JwtAuthenticationFilter(JwtService jwtService, SessionService sessionService) {
        this.jwtService = jwtService;
        this.sessionService = sessionService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        SecurityContextHolder.clearContext();

        String header = request.getHeader("Authorization");
        if (header == null || header.isBlank()) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "未提供令牌");
            filterChain.doFilter(request, response);
            return;
        }

        String[] parts = header.split(" ", 2);
        if (parts.length != 2 || !"Bearer".equalsIgnoreCase(parts[0]) || parts[1].isBlank()) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "未提供令牌");
            filterChain.doFilter(request, response);
            return;
        }

        try {
            JwtPrincipal principal = jwtService.parse(parts[1]);
            if (principal.jti() != null) {
                try {
                    if (!sessionService.isActive(principal.userId(), principal.jti())) {
                        request.setAttribute(AUTH_ERROR_ATTRIBUTE, "无效的令牌");
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (DataAccessException ex) {
                    log.warn("Redis unavailable while checking session, fail-open for user {}",
                        principal.userId(), ex);
                }
            }

            var authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.role())));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (JWTVerificationException ex) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "无效的令牌");
        }

        filterChain.doFilter(request, response);
    }
}
