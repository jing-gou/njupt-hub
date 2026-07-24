# NJUPT Notes 部署指南

本项目采用 Docker Compose 进行容器化部署，集成了前端、后端和数据库。

## 部署流程

### 1. 环境准备
确保您的服务器已安装：
- Docker
- Docker Compose

### 2. 配置文件说明
- **后端环境变量**：在 `docker-compose.yml` 的 `server` 服务下的 `environment` 部分进行配置。
  - `DATABASE_URL`: 数据库连接字符串，默认使用 Docker 网络内的 `db` 服务。
  - `JWT_SECRET`: 用于生成 Token 的密钥，建议修改。
  - `QINIU_*`: 七牛云存储配置。
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE`: SMTP 服务器地址、端口与 TLS 模式。端口 465 通常使用 `SMTP_SECURE=true`，587 通常使用 `false`。
  - `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`: 邮件服务账号、授权凭据与发件人。

### 3. 启动部署
在项目根目录下执行以下命令：

```bash
# 构建并后台启动所有服务
docker-compose up -d --build
```

### 4. 数据库初始化
服务启动后，需要对容器内的数据库进行 Schema 同步：

```bash
# 执行数据库迁移
docker-compose exec server npx prisma migrate deploy

# (可选) 执行初始数据填充
docker-compose exec server node src/seed-reviews.js
```

### 5. 访问地址
- **前端页面**：`http://您的服务器IP` (端口 80)
- **后端 API**：`http://您的服务器IP/api` (由 Nginx 反向代理)
- **数据库端口**：`3306` (已映射到外部，方便管理)

## 架构说明
- **前端 (Client)**: 采用 React 构建，经 `vite build` 后部署在 Nginx 容器中。
- **后端 (Server)**: Node.js Express 服务，集成了 Prisma ORM。
- **反向代理**: 前端 Nginx 容器兼任反向代理，将 `/api` 和 `/uploads` 请求转发至后端容器。
- **持久化**: 
  - `mysql_data`: 数据库数据持久化卷。
  - `server_uploads`: 后端上传文件持久化卷。

## 维护命令
- 查看日志：`docker-compose logs -f`
- 停止并删除容器：`docker-compose down`
- 重新部署某个服务：`docker-compose up -d --build <service_name>`
