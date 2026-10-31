package com.njupt.hub.contract;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.njupt.hub.auth.code.CodeType;
import com.njupt.hub.auth.code.VerificationCodeStore;
import com.njupt.hub.auth.mail.MailService;
import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@AutoConfigureMockMvc
@Transactional
@Import({ContractEchoController.class, ContractSeeder.class})
class ContractTest extends FullStackTestBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    @Autowired
    ContractSeeder seeder;

    @Autowired
    VerificationCodeStore codeStore;

    @Autowired
    StringRedisTemplate redis;

    @MockitoBean
    MailService mailService;

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

    @BeforeEach
    void cleanRedis() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void replays_node_contract(ContractCase contractCase) throws Exception {
        seeder.apply(contractCase.seed());

        if (contractCase.presetCode() != null) {
            ContractCase.PresetCode preset = contractCase.presetCode();
            CodeType type = "reset".equalsIgnoreCase(preset.type())
                ? CodeType.RESET
                : CodeType.VERIFICATION;
            codeStore.save(type, preset.email(), preset.code());
        }

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
            request.contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(contractCase.body()));
        }
        if (contractCase.loginAs() != null) {
            request.header("Authorization", "Bearer " + loginToken(contractCase.loginAs()));
        }

        MvcResult result = mvc.perform(request).andReturn();
        int actualStatus = result.getResponse().getStatus();
        assertThat(actualStatus)
            .as("status for %s %s, body=%s", contractCase.method(), contractCase.path(),
                result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .isEqualTo(contractCase.expected().status());

        JsonNode actualJson = mapper.readTree(
            result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        JsonNode expectedJson = contractCase.expected().json();

        JsonNode maskedActual = ContractNormalizer.mask(actualJson, contractCase.ignorePaths());
        JsonNode maskedExpected = ContractNormalizer.mask(expectedJson, contractCase.ignorePaths());

        JsonEquivalence.assertEquivalent(maskedExpected, maskedActual, 1e-6);
    }

    private String loginToken(String username) throws Exception {
        String body = mapper.writeValueAsString(
            java.util.Map.of("username", username, "password", "Password123"));
        MvcResult result = mvc.perform(MockMvcRequestBuilders.post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andReturn();

        assertThat(result.getResponse().getStatus()).as("login for %s", username).isEqualTo(200);
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
            .get("token").asText();
    }
}
