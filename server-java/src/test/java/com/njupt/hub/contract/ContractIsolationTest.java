package com.njupt.hub.contract;

import java.util.List;

import com.njupt.hub.support.FullStackTestBase;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ContractIsolationTest extends FullStackTestBase {

    @Autowired
    ContractSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    @Order(1)
    void seeded_users_are_visible_and_writes_are_local() {
        seeder.apply(List.of("users.sql"));

        Integer seeded = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `User` WHERE username IN ('alice','bob','admin','游客')",
            Integer.class);
        assertThat(seeded).isEqualTo(4);

        jdbc.update(
            "INSERT INTO `User` (username, password, email, role, experience, createdAt) "
                + "VALUES ('isolation_probe', 'x', 'isolation@example.com', 'USER', 0, NOW(3))");
    }

    @Test
    @Order(2)
    void previous_test_write_was_rolled_back() {
        Integer probes = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `User` WHERE username = 'isolation_probe'",
            Integer.class);
        assertThat(probes).isZero();
    }
}
