package com.njupt.hub.auth.user;

import com.njupt.hub.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class GuestUserService {

    private final UserMapper users;

    public GuestUserService(UserMapper users) {
        this.users = users;
    }

    public User getOrCreate() {
        User guest = users.selectOne(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User>()
                .eq(User::getUsername, "游客"));
        if (guest != null) {
            return guest;
        }

        users.insertGuestIgnore();
        guest = users.selectGuestForUpdate();
        if (guest == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "游客用户创建失败");
        }
        return guest;
    }
}
