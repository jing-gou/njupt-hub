package com.njupt.hub.sensitive;

import java.io.InputStream;
import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveWordFilterTest {

    private final SensitiveWordFilter filter = SensitiveWordFilter.forTesting("测试专用词");

    @Test
    void hits_builtin_word() {
        assertThat(filter.findFirst("我想找兼职")).isNotNull();
    }

    @Test
    void ignores_noise_characters_and_case() {
        assertThat(filter.findFirst("兼 职")).isNotNull();
        assertThat(filter.findFirst("兼-职")).isNotNull();
    }

    @Test
    void reads_extra_words() {
        assertThat(filter.findFirst("这是测试专用词")).isNotNull();
    }

    @Test
    void returns_null_for_clean_text() {
        assertThat(filter.findFirst("高等数学期末复习资料")).isNull();
    }

    @Test
    void matches_recorded_node_cases() throws Exception {
        try (InputStream in = getClass().getClassLoader()
            .getResourceAsStream("sensitive-cases.json")) {
            assertThat(in).as("sensitive-cases.json resource").isNotNull();
            List<Case> cases = new ObjectMapper().readValue(in, new TypeReference<>() {
            });

            for (Case testCase : cases) {
                assertThat(filter.contains(testCase.text()))
                    .as("node parity for text: %s", testCase.text())
                    .isEqualTo(testCase.expected());
            }
        }
    }

    record Case(String text, boolean expected) {
    }
}
