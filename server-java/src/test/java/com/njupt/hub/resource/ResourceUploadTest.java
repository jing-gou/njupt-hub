package com.njupt.hub.resource;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.resource.storage.QiniuStorage;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ResourceUploadTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MultipartProperties multipartProperties;

    @MockitoBean
    QiniuStorage storage;

    @BeforeEach
    void setUp() {
        seeder.apply(List.of("users.sql"));
        when(storage.upload(any(), anyString(), anyString(), anyString(), any()))
            .thenAnswer(invocation -> {
                String name = invocation.getArgument(1);
                String prefix = invocation.getArgument(2);
                String subPath = invocation.getArgument(3);
                String key = prefix + "/" + subPath + "/" + UUID.randomUUID() + "-" + name;
                return new QiniuStorage.UploadResult(key, "https://kodo.test/" + key);
            });
        when(storage.rawUrl(anyString())).thenAnswer(invocation ->
            "https://kodo.test/" + invocation.getArgument(0));
    }

    @Test
    void uploads_multiple_files_with_chinese_names_and_paths() throws Exception {
        MockMultipartFile first = new MockMultipartFile(
            "files", "中文资料.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));
        MockMultipartFile second = new MockMultipartFile(
            "files", "作业.pdf", "application/pdf", "pdf".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/resources/upload")
                .file(first)
                .file(second)
                .param("course", "高等数学")
                .param("category", "复习资料")
                .param("titles", "资料A", "资料B")
                .param("paths", "高等数学/第一章/资料A.txt", "资料B.pdf"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].title").value("资料A"))
            .andExpect(jsonPath("$.items[0].fileName").value("第一章/资料A.txt"))
            .andExpect(jsonPath("$.items[0].status").value("PENDING"))
            .andExpect(jsonPath("$.items[0].fileUrl").value(
                org.hamcrest.Matchers.startsWith("https://kodo.test/pending/")));
    }

    @Test
    void guest_upload_uses_guest_user_without_duplicates() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "files", "guest.txt", "text/plain", "guest".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/resources/upload")
                .file(file)
                .param("course", "大学物理"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items.length()").value(1));

        Integer guestResources = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `Resource` WHERE uploaderId = 1004", Integer.class);
        assertThat(guestResources).isEqualTo(1);
    }

    @Test
    void rejects_missing_course_or_files() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "files", "a.txt", "text/plain", "a".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/resources/upload").file(file))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("课程名称是必填项"));

        mvc.perform(multipart("/api/resources/upload").param("course", "高等数学"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("文件是必填项"));
    }

    @Test
    void multipart_limits_match_node() {
        assertThat(multipartProperties.getMaxFileSize().toBytes()).isEqualTo(150L * 1024 * 1024);
    }

    @Test
    void rejects_more_than_30_files() throws Exception {
        var request = multipart("/api/resources/upload");
        request.param("course", "高等数学");
        for (int index = 0; index < 31; index++) {
            request.file(new MockMultipartFile(
                "files", "file" + index + ".txt", "text/plain", "x".getBytes(StandardCharsets.UTF_8)));
        }

        mvc.perform(request)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("文件数量超过上限"));
    }

    @Test
    void guest_is_created_when_missing() throws Exception {
        jdbc.update("DELETE FROM `User` WHERE username = '游客'");
        MockMultipartFile file = new MockMultipartFile(
            "files", "guest.txt", "text/plain", "guest".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/resources/upload")
                .file(file)
                .param("course", "大学物理"))
            .andExpect(status().isCreated());

        Integer guests = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `User` WHERE username = '游客'", Integer.class);
        assertThat(guests).isEqualTo(1);
    }

    @Test
    void filename_decoder_handles_latin1_mojibake() {
        String mojibake = new String(
            "中文.txt".getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1);
        assertThat(MultipartFilenameDecoder.decode(mojibake)).isEqualTo("中文.txt");
        assertThat(MultipartFilenameDecoder.decode("中文.txt")).isEqualTo("中文.txt");
    }
}
