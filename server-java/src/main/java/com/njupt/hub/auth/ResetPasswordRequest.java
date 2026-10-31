package com.njupt.hub.auth;

public record ResetPasswordRequest(String email, String code, String newPassword) {
}
