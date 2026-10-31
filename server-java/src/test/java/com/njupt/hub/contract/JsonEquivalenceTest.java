package com.njupt.hub.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonEquivalenceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void accepts_numbers_within_tolerance() throws Exception {
        JsonNode expected = mapper.readTree("{\"avg\":4.6666666}");
        JsonNode actual = mapper.readTree("{\"avg\":4.6666670}");

        assertThatCode(() -> JsonEquivalence.assertEquivalent(expected, actual, 1e-6))
            .doesNotThrowAnyException();
    }

    @Test
    void rejects_numbers_outside_tolerance() throws Exception {
        JsonNode expected = mapper.readTree("{\"avg\":4.6}");
        JsonNode actual = mapper.readTree("{\"avg\":4.7}");

        assertThatThrownBy(() -> JsonEquivalence.assertEquivalent(expected, actual, 1e-6))
            .isInstanceOf(AssertionError.class)
            .hasMessageContaining("avg");
    }

    @Test
    void rejects_extra_fields() throws Exception {
        JsonNode expected = mapper.readTree("{\"a\":1}");
        JsonNode actual = mapper.readTree("{\"a\":1,\"b\":2}");

        assertThatThrownBy(() -> JsonEquivalence.assertEquivalent(expected, actual, 1e-6))
            .isInstanceOf(AssertionError.class);
    }
}
