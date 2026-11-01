package com.njupt.hub.resource;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@TestPropertySource(properties = "app.legacy-uploads-dir=src/test/resources/legacy-uploads")
class LegacyUploadsTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Test
    void serves_legacy_uploads_without_auth() throws Exception {
        mvc.perform(get("/uploads/hello.txt"))
            .andExpect(status().isOk())
            .andExpect(content().string("legacy-ok\n"));
    }
}
