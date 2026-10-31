package com.njupt.hub.auth.token;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.njupt.hub.auth.config.JwtProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwt = new JwtService(
        new JwtProperties("test-secret-please-change-32-bytes-min", Duration.ofDays(7)));

    @Test
    void issues_and_parses_claims() {
        String token = jwt.issue(7L, "USER", "alice", "jti-1");
        JwtPrincipal principal = jwt.parse(token);

        assertThat(principal.userId()).isEqualTo(7L);
        assertThat(principal.role()).isEqualTo("USER");
        assertThat(principal.username()).isEqualTo("alice");
        assertThat(principal.jti()).isEqualTo("jti-1");
        assertThat(principal.legacy()).isFalse();
    }

    @Test
    void parses_node_legacy_token_without_jti() throws Exception {
        String token;
        try (var in = getClass().getResourceAsStream("/auth/node-legacy-token.txt")) {
            token = new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
        }

        JwtPrincipal principal = jwt.parse(token);

        assertThat(principal.userId()).isEqualTo(1L);
        assertThat(principal.role()).isEqualTo("USER");
        assertThat(principal.username()).isEqualTo("alice");
        assertThat(principal.jti()).isNull();
        assertThat(principal.legacy()).isTrue();
    }

    @Test
    void rejects_expired_tokens() {
        JwtService expired = new JwtService(
            new JwtProperties("test-secret-please-change-32-bytes-min", Duration.ofSeconds(-1)));
        String token = expired.issue(1L, "USER", "alice", "jti-expired");

        assertThatThrownBy(() -> jwt.parse(token))
            .isInstanceOf(JWTVerificationException.class);
    }

    @Test
    void rejects_tampered_tokens() {
        assertThatThrownBy(() -> jwt.parse("not-a-token"))
            .isInstanceOf(JWTVerificationException.class);
    }
}
