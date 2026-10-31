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

    @Test
    void baseline_includes_latest_columns() {
        List<String> userColumns = columnsOf("User");
        assertThat(userColumns).contains("experience", "avatarKey", "role");

        List<String> resourceColumns = columnsOf("Resource");
        assertThat(resourceColumns).contains(
            "fileKey", "fileName", "fileSize", "mimeType",
            "thankYouEmailSentAt", "reviewResultEmailSentAt", "reviewResultEmailStatus");
    }

    @Test
    void baseline_includes_indexes_and_foreign_keys() {
        List<String> indexes = jdbc.queryForList(
            "SELECT DISTINCT index_name FROM information_schema.statistics "
                + "WHERE table_schema = DATABASE() AND table_name = 'Resource'",
            String.class);
        assertThat(indexes).contains(
            "Resource_status_idx", "Resource_course_idx", "Resource_category_idx");

        Integer foreignKeys = jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.table_constraints "
                + "WHERE table_schema = DATABASE() AND constraint_type = 'FOREIGN KEY'",
            Integer.class);
        assertThat(foreignKeys).isEqualTo(9);
    }

    private List<String> columnsOf(String table) {
        return jdbc.queryForList(
            "SELECT column_name FROM information_schema.columns "
                + "WHERE table_schema = DATABASE() AND table_name = ?",
            String.class, table);
    }
}
