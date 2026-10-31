package com.njupt.hub.auth.avatar;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.njupt.hub.auth.config.QiniuProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;

@Component
public class QiniuUrlSigner {

    private static final long DEFAULT_EXPIRES = 7200;

    private final QiniuProperties properties;
    private final String protocol;
    private final String domain;
    private final List<String> legacyDomains;

    public QiniuUrlSigner(QiniuProperties properties) {
        this.properties = properties;
        this.protocol = "http".equalsIgnoreCase(properties.protocol()) ? "http" : "https";
        this.domain = normalizeDomain(properties.domain());
        List<String> legacy = properties.legacyDomains();
        List<String> normalizedLegacy = legacy == null
            ? List.of()
            : legacy.stream()
                .map(this::normalizeDomain)
                .filter(value -> value != null && !value.isBlank())
                .toList();
        this.legacyDomains = normalizedLegacy.isEmpty()
            ? List.of("kodo.sugarfun.xyz")
            : normalizedLegacy;
    }

    public String getSignedUrl(String fileKey) {
        return getSignedUrl(fileKey, DEFAULT_EXPIRES);
    }

    public String getSignedUrl(String fileKey, long expires) {
        if (fileKey == null || fileKey.isBlank()) {
            return "";
        }
        String raw = fileKey.trim();
        if (raw.contains("://")) {
            try {
                URI uri = URI.create(raw);
                String host = uri.getHost();
                if (host == null || (domain != null && host.equals(domain)) || legacyDomains.contains(host)) {
                    String path = uri.getRawPath() == null ? "" : uri.getRawPath();
                    String key = UriUtils.decode(path.replaceFirst("^/+", ""), StandardCharsets.UTF_8);
                    return sign(key, expires);
                }
                return raw;
            } catch (IllegalArgumentException ex) {
                // fall through and treat as a key
            }
        }
        return sign(raw.replaceFirst("^/+", ""), expires);
    }

    public static String normalizeStoredFileKey(String fileValue) {
        if (fileValue == null) {
            return "";
        }
        String raw = fileValue.trim();
        if (raw.isEmpty()) {
            return "";
        }
        if (raw.contains("://")) {
            try {
                URI uri = URI.create(raw);
                String path = uri.getRawPath() == null ? "" : uri.getRawPath();
                return UriUtils.decode(path.replaceFirst("^/+", ""), StandardCharsets.UTF_8);
            } catch (IllegalArgumentException ex) {
                return raw.replaceFirst("^/+", "");
            }
        }
        return raw.replaceFirst("^/+", "");
    }

    private String sign(String key, long expires) {
        if (domain == null || domain.isBlank()) {
            return key;
        }
        String base = protocol + "://" + domain + UriUtils.encodePath("/" + key, StandardCharsets.UTF_8);
        if (!properties.privateBucket()) {
            return base;
        }
        long deadline = Instant.now().getEpochSecond() + expires;
        String urlWithDeadline = base + (base.contains("?") ? "&" : "?") + "e=" + deadline;
        String token = hmacSha1(urlWithDeadline, properties.secretKey());
        return urlWithDeadline + "&token=" + properties.accessKey() + ":" + token;
    }

    private String hmacSha1(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign qiniu url", ex);
        }
    }

    private String normalizeDomain(String value) {
        if (value == null) {
            return null;
        }
        return value.trim()
            .replaceFirst("(?i)^https?://", "")
            .replaceAll("/+$", "");
    }

    public String protocol() {
        return protocol.toLowerCase(Locale.ROOT);
    }
}
