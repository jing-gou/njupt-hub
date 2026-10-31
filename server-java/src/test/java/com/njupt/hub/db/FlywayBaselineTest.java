package com.njupt.hub.db;

import java.util.List;

import com.njupt.hub.support.MySqlTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayBaselineTest extends MySqlTestBase {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void baseline_creates_all_prisma_tables() {
        List<String> tables = jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
            String.class);

        assertThat(tables).contains(
            "User", "Resource", "Review", "Like", "Reply", "Report", "ReviewableItem");
    }
}
