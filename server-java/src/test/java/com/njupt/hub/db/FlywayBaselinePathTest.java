package com.njupt.hub.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import com.njupt.hub.support.MySqlTestBase;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayBaselinePathTest extends MySqlTestBase {

    @Test
    void existing_schema_is_baselined_without_replaying_v1() throws Exception {
        String serverUrl = MYSQL.getJdbcUrl().replace("/test", "/");
        String legacyUrl = MYSQL.getJdbcUrl().replace("/test", "/legacy_baseline");

        try (Connection connection = DriverManager.getConnection(
            serverUrl, "root", MYSQL.getPassword());
             Statement statement = connection.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS legacy_baseline");
            statement.execute("CREATE DATABASE legacy_baseline");
            statement.execute(
                "CREATE TABLE legacy_baseline.`User` (id INT PRIMARY KEY)");
            statement.execute(
                "CREATE TABLE legacy_baseline.`Resource` (id INT PRIMARY KEY)");
        }

        Flyway flyway = Flyway.configure()
            .dataSource(legacyUrl, "root", MYSQL.getPassword())
            .baselineOnMigrate(true)
            .baselineVersion("1")
            .locations("classpath:db/migration")
            .load();

        MigrateResult result = flyway.migrate();

        assertThat(result.migrationsExecuted).isEqualTo(2);

        try (Connection connection = DriverManager.getConnection(
            legacyUrl, "root", MYSQL.getPassword());
             Statement statement = connection.createStatement()) {
            var baseline = statement.executeQuery(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND type = 'BASELINE'");
            assertThat(baseline.next()).isTrue();
            assertThat(baseline.getInt(1)).isEqualTo(1);

            var columnCount = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.columns "
                    + "WHERE table_schema = 'legacy_baseline' AND table_name = 'User'");
            assertThat(columnCount.next()).isTrue();
            assertThat(columnCount.getInt(1)).isEqualTo(1);

            var emailColumns = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.columns "
                    + "WHERE table_schema = 'legacy_baseline' AND table_name = 'Resource' "
                    + "AND column_name IN ('thankYouEmailSentAt','reviewResultEmailSentAt','reviewResultEmailStatus')");
            assertThat(emailColumns.next()).isTrue();
            assertThat(emailColumns.getInt(1)).isEqualTo(3);

            var outbox = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.tables "
                    + "WHERE table_schema = 'legacy_baseline' AND table_name = 'mail_outbox'");
            assertThat(outbox.next()).isTrue();
            assertThat(outbox.getInt(1)).isEqualTo(1);
        }
    }
}
