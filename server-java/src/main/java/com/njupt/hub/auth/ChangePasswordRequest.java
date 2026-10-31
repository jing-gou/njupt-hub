package com.njupt.hub.auth;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
}
