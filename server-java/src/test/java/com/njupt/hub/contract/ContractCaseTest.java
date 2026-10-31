package com.njupt.hub.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContractCaseTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void reads_json_object_body_and_defaults_to_parity() throws Exception {
        ContractCase contractCase = mapper.readValue("""
            {
              "name": "echo",
              "method": "POST",
              "path": "/test/echo",
              "headers": {"X-Test": "1"},
              "body": {"name": "njupt"},
              "expected": {"status": 200, "json": {"received": {"name": "njupt"}}}
            }
            """, ContractCase.class);

        assertThat(contractCase.body().get("name").asText()).isEqualTo("njupt");
        assertThat(contractCase.type()).isEqualTo("parity");
        assertThat(contractCase.headers()).containsEntry("X-Test", "1");
    }
}
