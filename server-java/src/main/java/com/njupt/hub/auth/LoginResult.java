package com.njupt.hub.auth;

import com.njupt.hub.auth.user.UserView;

public record LoginResult(String token, UserView user) {
}
