# NJUPT Hub — Java 后端

Batch 0：Spring Boot 骨架、契约回放与敏感词模块。现有 Node 后端仍在 `server/`，前端不改。

## 环境

- Java 21
- Maven 3.9（仓库自带 `mvnw`）
- Docker（Testcontainers 需要）
- MySQL 8 仅在 Testcontainers 中自动启动

## 常用命令

```bash
# 单元测试
./mvnw test

# 全量验证（含 Testcontainers）
./mvnw verify

# 本地运行（需要可达的 MySQL，或使用 docker-compose.java.yml）
./mvnw spring-boot:run
```

测试镜像无法从 Docker Hub 拉取时，可先通过镜像加速器拉取并打回原名：

```bash
docker pull docker.m.daocloud.io/library/mysql:8.0
docker tag docker.m.daocloud.io/library/mysql:8.0 mysql:8.0
docker pull docker.m.daocloud.io/testcontainers/ryuk:0.12.0
docker tag docker.m.daocloud.io/testcontainers/ryuk:0.12.0 testcontainers/ryuk:0.12.0
```

## 契约测试

契约夹具位于 `src/test/resources/contract/*.json`，以现有 Node 服务为事实来源。
`ignorePaths` 用于屏蔽自增 ID、时间、签名 URL 等易变字段。

录制（Node 服务运行在 `:3000`）：

```bash
node scripts/record-contract.mjs --base-url http://localhost:3000 --dry-run
node scripts/record-contract.mjs --base-url http://localhost:3000 --force
```

## 配置

生产通过环境变量注入：

- `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
- `SENSITIVE_WORDS`（逗号分隔的补充敏感词）

## Docker

```bash
docker build -t njupt-hub-java:dev .
docker compose -f ../docker-compose.java.yml up -d --build
```
