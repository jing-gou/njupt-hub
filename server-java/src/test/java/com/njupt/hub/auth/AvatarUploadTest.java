package com.njupt.hub.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.resource.storage.QiniuStorage;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class AvatarUploadTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    ObjectMapper mapper;

    @MockitoBean
    QiniuStorage storage;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql"));
        when(storage.upload(any(), anyString(), anyString(), anyString(), any()))
            .thenReturn(new QiniuStorage.UploadResult(
                "assets/avatars/new-avatar.png", "https://kodo.test/assets/avatars/new-avatar.png"));
    }

    @Test
    void uploads_avatar_and_deletes_old_file() throws Exception {
        String token = login("alice", "Password123");
        MockMultipartFile file = new MockMultipartFile(
            "avatar", "avatar.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/auth/avatar").file(file)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("头像更新成功"))
            .andExpect(jsonPath("$.user.avatarUrl")
                .value("https://kodo.test/assets/avatars/new-avatar.png"));

        verify(storage).delete("assets/avatars/alice.png");
        String key = jdbc.queryForObject(
            "SELECT avatarKey FROM `User` WHERE id = 1001", String.class);
        assertThat(key).isEqualTo("assets/avatars/new-avatar.png");
    }

    @Test
    void old_avatar_delete_failure_does_not_block_update() throws Exception {
        String token = login("alice", "Password123");
        org.mockito.Mockito.doThrow(new IllegalStateException("qiniu down"))
            .when(storage).delete(anyString());
        MockMultipartFile file = new MockMultipartFile(
            "avatar", "avatar.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/auth/avatar").file(file)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.avatarUrl")
                .value("https://kodo.test/assets/avatars/new-avatar.png"));
    }

    @Test
    void missing_file_returns_400() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(multipart("/api/auth/avatar")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("未上传头像文件"));
    }

    @Test
    void guest_returns_401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "avatar", "avatar.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/auth/avatar").file(file))
            .andExpect(status().isUnauthorized());
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(
                    java.util.Map.of("username", username, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();
    }
}
