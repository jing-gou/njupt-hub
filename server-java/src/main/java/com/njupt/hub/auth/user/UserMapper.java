package com.njupt.hub.auth.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Insert("""
        INSERT INTO `User` (`username`, `password`, `email`, `role`, `experience`, `createdAt`)
        VALUES ('游客', 'guest-no-password', 'guest@njupt.hub', 'USER', 0, NOW(3))
        ON DUPLICATE KEY UPDATE `username` = `username`
        """)
    int insertGuestIgnore();

    @Select("SELECT * FROM `User` WHERE `username` = '游客' FOR UPDATE")
    User selectGuestForUpdate();
}
