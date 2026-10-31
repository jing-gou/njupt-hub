package com.njupt.hub.auth.token;

import java.security.Principal;

public record JwtPrincipal(
    long userId,
    String role,
    String username,
    String jti,
    boolean legacy
) implements Principal {

    @Override
    public String getName() {
        return username;
    }
}
