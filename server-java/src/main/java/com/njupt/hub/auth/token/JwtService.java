package com.njupt.hub.auth.token;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.njupt.hub.auth.config.JwtProperties;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final Algorithm algorithm;
    private final JWTVerifier verifier;
    private final Duration ttl;

    public JwtService(JwtProperties properties) {
        if (properties.secret() == null || properties.secret().isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not set");
        }
        this.algorithm = Algorithm.HMAC256(properties.secret());
        this.verifier = JWT.require(algorithm).build();
        this.ttl = properties.ttl() == null ? Duration.ofDays(7) : properties.ttl();
    }

    public String issue(long userId, String role, String username, String jti) {
        var builder = JWT.create()
            .withSubject(Long.toString(userId))
            .withClaim("role", role)
            .withClaim("username", username)
            .withIssuedAt(new Date())
            .withExpiresAt(Date.from(Instant.now().plus(ttl)));

        if (jti != null && !jti.isBlank()) {
            builder.withJWTId(jti);
        }
        return builder.sign(algorithm);
    }

    public JwtPrincipal parse(String token) {
        DecodedJWT jwt = verifier.verify(token);

        Claim subject = jwt.getClaim("sub");
        long userId = subject.asLong() != null
            ? subject.asLong()
            : Long.parseLong(subject.asString());

        String role = jwt.getClaim("role").asString();
        String username = jwt.getClaim("username").asString();
        String jti = jwt.getClaim("jti").asString();

        return new JwtPrincipal(userId, role, username, jti, jti == null || jti.isBlank());
    }

    public Duration ttl() {
        return ttl;
    }
}
