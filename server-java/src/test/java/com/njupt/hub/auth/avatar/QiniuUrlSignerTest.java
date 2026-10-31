package com.njupt.hub.auth.avatar;

import java.util.List;

import com.njupt.hub.auth.config.QiniuProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QiniuUrlSignerTest {

    private final QiniuUrlSigner publicSigner = new QiniuUrlSigner(new QiniuProperties(
        "access", "secret", "bucket", "kodo.test", "https", false,
        List.of("kodo.legacy.test")));

    @Test
    void returns_public_url_for_key() {
        assertThat(publicSigner.getSignedUrl("assets/avatars/alice.png"))
            .isEqualTo("https://kodo.test/assets/avatars/alice.png");
    }

    @Test
    void leaves_external_urls_untouched() {
        assertThat(publicSigner.getSignedUrl("https://example.com/a.png"))
            .isEqualTo("https://example.com/a.png");
    }

    @Test
    void rewrites_legacy_domain_to_current_domain() {
        assertThat(publicSigner.getSignedUrl("https://kodo.legacy.test/assets/a.png"))
            .isEqualTo("https://kodo.test/assets/a.png");
    }

    @Test
    void signs_private_urls() {
        QiniuUrlSigner privateSigner = new QiniuUrlSigner(new QiniuProperties(
            "access", "secret", "bucket", "kodo.test", "https", true,
            List.of("kodo.legacy.test")));

        String url = privateSigner.getSignedUrl("assets/a.png");

        assertThat(url).startsWith("https://kodo.test/assets/a.png?e=");
        assertThat(url).contains("&token=access:");
    }

    @Test
    void normalizes_stored_url_to_key() {
        assertThat(QiniuUrlSigner.normalizeStoredFileKey(
            "https://kodo.test/assets/a%20b.png")).isEqualTo("assets/a b.png");
    }
}
