package com.njupt.hub.contract;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ContractCase(
    @JsonProperty("name") String name,
    @JsonProperty("method") String method,
    @JsonProperty("path") String path,
    @JsonProperty("headers") Map<String, String> headers,
    @JsonProperty("body") String body,
    @JsonProperty("expected") Expected expected,
    @JsonProperty("ignorePaths") List<String> ignorePaths
) {

    public ContractCase {
        headers = headers == null ? Map.of() : headers;
        ignorePaths = ignorePaths == null ? List.of() : ignorePaths;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Expected(
        @JsonProperty("status") int status,
        @JsonProperty("json") JsonNode json
    ) {
    }
}
