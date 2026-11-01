package com.njupt.hub.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import com.njupt.hub.support.MySqlTestBase;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayV3Test extends MySqlTestBase {

    @Test
    void adds_email_tracking_columns_to_older_resource_schema() throws Exception {
        String serverUrl = MYSQL.getJdbcUrl().replace("/test", "/");
        String legacyUrl = MYSQL.getJdbcUrl().replace("/test", "/legacy_v3");

        try (Connection connection = DriverManager.getConnection(serverUrl, "root", MYSQL.getPassword());
             Statement statement = connection.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS legacy_v3");
            statement.execute("CREATE DATABASE legacy_v3");
            statement.execute("CREATE TABLE legacy_v3.`Resource` (id INT PRIMARY KEY)");
        }

        Flyway.configure()
            .dataSource(legacyUrl, "root", MYSQL.getPassword())
            .baselineOnMigrate(true)
            .baselineVersion("1")
            .locations("classpath:db/migration")
            .load()
            .migrate();

        try (Connection connection = DriverManager.getConnection(legacyUrl, "root", MYSQL.getPassword());
             Statement statement = connection.createStatement()) {
            var result = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.columns "
                    + "WHERE table_schema = 'legacy_v3' AND table_name = 'Resource' "
                    + "AND column_name IN ('thankYouEmailSentAt','reviewResultEmailSentAt','reviewResultEmailStatus')");
            assertThat(result.next()).isTrue();
            assertThat(result.getInt(1)).isEqualTo(3);
        }
    }
}
