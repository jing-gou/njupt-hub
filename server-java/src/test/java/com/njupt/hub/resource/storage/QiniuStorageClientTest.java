package com.njupt.hub.resource.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QiniuStorageClientTest {

    @Test
    void build_key_includes_prefix_sub_path_and_extension() {
        String key = QiniuStorageClient.buildKey("pending", "高等数学/第一章", "资料.pdf");

        assertThat(key).startsWith("pending/高等数学/第一章/");
        assertThat(key).endsWith(".pdf");
    }
}
