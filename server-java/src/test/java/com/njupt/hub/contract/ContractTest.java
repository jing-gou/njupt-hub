package com.njupt.hub.contract;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.support.MySqlTestBase;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.assertj.core.api.Assertions.assertThat;

@AutoConfigureMockMvc
class ContractTest extends MySqlTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    static Stream<ContractCase> cases() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
            .getResources("classpath:contract/*.json");

        List<Resource> ordered = new ArrayList<>(List.of(resources));
        ordered.sort(Comparator.comparing(Resource::getFilename));

        ObjectMapper reader = new ObjectMapper();
        List<ContractCase> cases = new ArrayList<>();
        for (Resource resource : ordered) {
            cases.add(reader.readValue(resource.getInputStream(), ContractCase.class));
        }
        return cases.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void replays_node_contract(ContractCase contractCase) throws Exception {
        MockHttpServletRequestBuilder request = switch (contractCase.method().toUpperCase()) {
            case "GET" -> MockMvcRequestBuilders.get(contractCase.path());
            case "POST" -> MockMvcRequestBuilders.post(contractCase.path());
            case "PUT" -> MockMvcRequestBuilders.put(contractCase.path());
            case "PATCH" -> MockMvcRequestBuilders.patch(contractCase.path());
            case "DELETE" -> MockMvcRequestBuilders.delete(contractCase.path());
            default -> throw new IllegalArgumentException(
                "Unsupported method: " + contractCase.method());
        };

        contractCase.headers().forEach(request::header);
        if (contractCase.body() != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(contractCase.body());
        }

        MvcResult result = mvc.perform(request).andReturn();
        int actualStatus = result.getResponse().getStatus();
        assertThat(actualStatus)
            .as("status for %s %s", contractCase.method(), contractCase.path())
            .isEqualTo(contractCase.expected().status());

        JsonNode actualJson = mapper.readTree(
            result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        JsonNode expectedJson = contractCase.expected().json();

        JsonNode maskedActual = ContractNormalizer.mask(actualJson, contractCase.ignorePaths());
        JsonNode maskedExpected = ContractNormalizer.mask(expectedJson, contractCase.ignorePaths());

        JSONAssert.assertEquals(maskedExpected.toString(), maskedActual.toString(), true);
    }
}
