package com.njupt.hub.resource;

import java.util.List;

import com.njupt.hub.contract.ContractSeeder;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@Transactional
class ResourceListTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ContractSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder.apply(List.of("users.sql", "resources.sql"));
    }

    @Test
    void lists_resources_with_pagination_and_uploader() throws Exception {
        mvc.perform(get("/api/resources"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(5))
            .andExpect(jsonPath("$.page").value(1))
            .andExpect(jsonPath("$.pageSize").value(20))
            .andExpect(jsonPath("$.items[0].id").value(2005))
            .andExpect(jsonPath("$.items[0].uploader.username").value("bob"))
            .andExpect(jsonPath("$.items[0].uploader.email").value("bob@example.com"))
            .andExpect(jsonPath("$.items[0].createdAt")
                .value(org.hamcrest.Matchers.matchesPattern(".*Z$")))
            .andExpect(jsonPath("$.items[0].fileUrl")
                .value("https://kodo.test/public/math/exam.pdf"));
    }

    @Test
    void filters_by_course_status_and_query() throws Exception {
        mvc.perform(get("/api/resources").param("course", "高等数学"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(3));

        mvc.perform(get("/api/resources").param("status", "APPROVED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(2));

        mvc.perform(get("/api/resources").param("q", "试卷"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].id").value(2005));
    }

    @Test
    void paginates_and_sorts_by_download_count() throws Exception {
        mvc.perform(get("/api/resources")
                .param("page", "2")
                .param("pageSize", "2")
                .param("sort", "downloadCount")
                .param("order", "desc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(5))
            .andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test
    void returns_detail_and_404() throws Exception {
        mvc.perform(get("/api/resources/2001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("高等数学期末复习提纲"))
            .andExpect(jsonPath("$.uploader.username").value("alice"))
            .andExpect(jsonPath("$.fileKey").value("public/math/outline.pdf"))
            .andExpect(jsonPath("$.fileUrl").value("https://kodo.test/public/math/outline.pdf"));

        mvc.perform(get("/api/resources/999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("资源未找到"));
    }

    @Test
    void rejects_invalid_id() throws Exception {
        mvc.perform(get("/api/resources/not-a-number"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("无效的 ID"));
    }
}
