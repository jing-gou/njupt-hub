package com.njupt.hub.contract;

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
        for (String seed : seeds) {
            ScriptUtils.executeSqlScript(
                DataSourceUtils.getConnection(dataSource),
                new ClassPathResource("contract/seed/" + seed));
        }
    }
}
