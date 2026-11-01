package com.njupt.hub.meta;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MetaEndpointSecurityTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Test
    void commits_is_public_and_explicit_501() throws Exception {
        mvc.perform(get("/api/meta/commits"))
            .andExpect(status().isNotImplemented())
            .andExpect(jsonPath("$.message").value("该接口尚未迁移到 Java 后端"));
    }
}
