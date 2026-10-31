package com.njupt.hub.auth;

public record RegisterRequest(String username, String password, String email, String code) {
}
