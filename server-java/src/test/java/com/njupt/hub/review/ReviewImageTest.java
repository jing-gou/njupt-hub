package com.njupt.hub.review;

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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

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
class ReviewImageTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    ObjectMapper mapper;

    @MockitoBean
    QiniuStorage storage;

    @BeforeEach
    void setUp() {
        seeder.apply(List.of("users.sql", "reviews.sql"));
        when(storage.upload(any(), anyString(), anyString(), anyString(), any()))
            .thenAnswer(invocation -> {
                String name = invocation.getArgument(1);
                String subPath = invocation.getArgument(3);
                String key = "assets/" + subPath + "/" + name;
                return new QiniuStorage.UploadResult(key, "https://kodo.test/" + key);
            });
    }

    @Test
    void uploads_review_image() throws Exception {
        String token = login("alice", "Password123");
        MockMultipartFile file = new MockMultipartFile(
            "image", "review.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/reviews/upload-image").file(file)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.url").value("https://kodo.test/assets/reviews/review.png"));
    }

    @Test
    void admin_can_replace_item_image() throws Exception {
        String token = login("admin", "Password123");
        MockMultipartFile file = new MockMultipartFile(
            "image", "item.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/reviews/admin/items/3001/image").file(file)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("上传成功"))
            .andExpect(jsonPath("$.imageUrl").value("https://kodo.test/assets/items/item.png"));

        verify(storage).delete("assets/items/mentor.png");
    }

    @Test
    void non_admin_cannot_replace_item_image() throws Exception {
        String token = login("alice", "Password123");
        MockMultipartFile file = new MockMultipartFile(
            "image", "item.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/reviews/admin/items/3001/image").file(file)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_upload_returns_401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "image", "review.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/reviews/upload-image").file(file))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void missing_file_returns_400() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(multipart("/api/reviews/upload-image")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("未上传文件"));
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
