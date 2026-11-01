package com.njupt.hub.db;

import java.util.List;

import com.njupt.hub.support.MySqlTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayV2Test extends MySqlTestBase {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void creates_mail_outbox_with_unique_dedupe_key() {
        List<String> tables = jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
            String.class);
        assertThat(tables).contains("mail_outbox");

        List<String> indexes = jdbc.queryForList(
            "SELECT index_name FROM information_schema.statistics "
                + "WHERE table_schema = DATABASE() AND table_name = 'mail_outbox'",
            String.class);
        assertThat(indexes).contains("mail_outbox_dedupe_key", "mail_outbox_due_idx");
    }
}
