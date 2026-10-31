package com.njupt.hub.auth.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "qiniu")
public record QiniuProperties(
    String accessKey,
    String secretKey,
    String bucket,
    String domain,
    String protocol,
    boolean privateBucket,
    List<String> legacyDomains
) {
}
