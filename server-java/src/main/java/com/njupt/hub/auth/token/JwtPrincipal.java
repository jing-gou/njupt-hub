package com.njupt.hub.auth.token;

public record JwtPrincipal(
    long userId,
    String role,
    String username,
    String jti,
    boolean legacy
) {
}
