package com.njupt.hub.contract;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContractNormalizerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void masks_nested_ids_and_array_elements() throws Exception {
        JsonNode node = mapper.readTree("""
            {"id":1,"items":[{"id":2,"name":"a"},{"id":3,"name":"b"}],"fileUrl":"https://x/y?e=1&token=2"}
            """);

        JsonNode masked = ContractNormalizer.mask(
            node, List.of("/id", "/items/*/id", "/fileUrl"));

        assertThat(masked.at("/id").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/items/0/id").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/items/1/id").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/fileUrl").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/items/0/name").asText()).isEqualTo("a");
    }

    @Test
    void masks_all_children_when_star_is_last_segment() throws Exception {
        JsonNode node = mapper.readTree("""
            {"items":[{"id":2},{"id":3}],"map":{"a":1,"b":2}}
            """);

        JsonNode masked = ContractNormalizer.mask(node, List.of("/items/*", "/map/*"));

        assertThat(masked.at("/items/0").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/items/1").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/map/a").asText()).isEqualTo("<masked>");
        assertThat(masked.at("/map/b").asText()).isEqualTo("<masked>");
    }
}
