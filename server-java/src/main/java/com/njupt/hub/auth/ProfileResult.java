package com.njupt.hub.auth;

import com.njupt.hub.auth.user.UserView;

public record ProfileResult(String token, UserView user) {
}
