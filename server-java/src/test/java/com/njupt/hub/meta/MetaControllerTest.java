package com.njupt.hub.meta;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MetaControllerTest {

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new MetaController()).build();

    @Test
    void commits_endpoint_is_explicitly_not_implemented() throws Exception {
        mvc.perform(get("/api/meta/commits"))
            .andExpect(status().isNotImplemented())
            .andExpect(jsonPath("$.message").value("该接口尚未迁移到 Java 后端"));
    }
}
