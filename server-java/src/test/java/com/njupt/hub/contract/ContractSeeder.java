package com.njupt.hub.contract;

import java.sql.Connection;
import java.util.List;

import javax.sql.DataSource;

import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

@Component
public class ContractSeeder {

    private final DataSource dataSource;

    public ContractSeeder(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void apply(List<String> seeds) {
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try {
            for (String seed : seeds) {
                ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("contract/seed/" + seed));
            }
        } finally {
            DataSourceUtils.releaseConnection(connection, dataSource);
        }
    }
}
