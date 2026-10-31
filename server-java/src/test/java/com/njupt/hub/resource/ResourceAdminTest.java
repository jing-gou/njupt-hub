package com.njupt.hub.resource;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.auth.mail.MailService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ResourceAdminTest extends FullStackTestBase {

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

    @MockitoBean
    MailService mailService;

    @BeforeEach
    void setUp() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        seeder.apply(List.of("users.sql", "resources.sql"));
        when(storage.signedUrl(anyString())).thenAnswer(invocation ->
            "https://kodo.test/" + invocation.getArgument(0));
        when(storage.rawUrl(anyString())).thenAnswer(invocation ->
            "https://kodo.test/" + invocation.getArgument(0));
        when(storage.normalizeKey(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void download_url_increments_count() throws Exception {
        mvc.perform(get("/api/resources/2001/download-url"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.downloadUrl").value("https://kodo.test/public/math/outline.pdf"));

        Integer count = jdbc.queryForObject(
            "SELECT downloadCount FROM `Resource` WHERE id = 2001", Integer.class);
        assertThat(count).isEqualTo(11);
    }

    @Test
    void increment_download_endpoint_returns_new_count() throws Exception {
        mvc.perform(post("/api/resources/2001/download"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(2001))
            .andExpect(jsonPath("$.downloadCount").value(11));
    }

    @Test
    void approving_resource_moves_file_and_adds_experience_once() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.fileKey").value("public/math/linear.pdf"))
            .andExpect(jsonPath("$.reviewNotification.sent").value(true));

        verify(storage).move("pending/math/linear.pdf", "public/math/linear.pdf");
        Integer bobExperience = jdbc.queryForObject(
            "SELECT experience FROM `User` WHERE id = 1002", Integer.class);
        assertThat(bobExperience).isEqualTo(90);

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk());

        Integer afterRepeat = jdbc.queryForObject(
            "SELECT experience FROM `User` WHERE id = 1002", Integer.class);
        assertThat(afterRepeat).isEqualTo(90);
        verify(mailService, times(1)).sendResourceReviewResultEmail(anyString(), anyString(), any());
    }

    @Test
    void move_failure_does_not_block_status_update() throws Exception {
        String token = login("admin", "Password123");
        org.mockito.Mockito.doThrow(new IllegalStateException("qiniu down"))
            .when(storage).move(anyString(), anyString());

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void guest_resource_approval_does_not_add_experience() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2004/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isOk());

        Integer guestExperience = jdbc.queryForObject(
            "SELECT experience FROM `User` WHERE id = 1004", Integer.class);
        assertThat(guestExperience).isEqualTo(50);
    }

    @Test
    void meta_rejects_empty_title_and_missing_resource() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2001/meta")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"  \"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("标题不能为空"));

        mvc.perform(patch("/api/resources/999999/meta")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void rejecting_resource_deletes_file_and_clears_key() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2001/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REJECTED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.fileKey").value(org.hamcrest.Matchers.nullValue()));

        verify(storage).delete("public/math/outline.pdf");
    }

    @Test
    void non_admin_cannot_change_status() throws Exception {
        String token = login("alice", "Password123");

        mvc.perform(patch("/api/resources/2002/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("拒绝访问"));
    }

    @Test
    void admin_can_update_meta_and_delete() throws Exception {
        String token = login("admin", "Password123");

        mvc.perform(patch("/api/resources/2001/meta")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"新标题\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("新标题"));

        mvc.perform(delete("/api/resources/2001")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("资源已删除"));

        mvc.perform(get("/api/resources/2001"))
            .andExpect(status().isNotFound());
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
