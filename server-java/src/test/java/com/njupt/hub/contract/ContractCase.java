package com.njupt.hub.contract;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ContractCase(
    @JsonProperty("name") String name,
    @JsonProperty("type") String type,
    @JsonProperty("deviationRef") String deviationRef,
    @JsonProperty("method") String method,
    @JsonProperty("path") String path,
    @JsonProperty("headers") Map<String, String> headers,
    @JsonProperty("params") Map<String, List<String>> params,
    @JsonProperty("body") JsonNode body,
    @JsonProperty("expected") Expected expected,
    @JsonProperty("ignorePaths") List<String> ignorePaths,
    @JsonProperty("seed") List<String> seed,
    @JsonProperty("loginAs") String loginAs,
    @JsonProperty("presetCode") PresetCode presetCode,
    @JsonProperty("multipart") Multipart multipart
) {

    public ContractCase {
        headers = headers == null ? Map.of() : headers;
        params = params == null ? Map.of() : params;
        ignorePaths = ignorePaths == null ? List.of() : ignorePaths;
        seed = seed == null ? List.of() : seed;
        type = type == null || type.isBlank() ? "parity" : type;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Expected(
        @JsonProperty("status") int status,
        @JsonProperty("json") JsonNode json
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PresetCode(
        @JsonProperty("type") String type,
        @JsonProperty("email") String email,
        @JsonProperty("code") String code
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Multipart(
        @JsonProperty("fields") Map<String, List<String>> fields,
        @JsonProperty("files") List<FilePart> files
    ) {
        public Multipart {
            fields = fields == null ? Map.of() : fields;
            files = files == null ? List.of() : files;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FilePart(
        @JsonProperty("field") String field,
        @JsonProperty("filename") String filename,
        @JsonProperty("contentType") String contentType,
        @JsonProperty("resource") String resource
    ) {
    }
}
