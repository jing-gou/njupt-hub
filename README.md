# NJUPT Hub

## Dev Setup

### 1) MySQL (Docker)

```bash
docker compose up -d
```

The default database in [docker-compose.yml](file:///e:/workshop/njupt-notes%20-%20副本/docker-compose.yml) is:

- user: root
- password: root_password
- db: my_blog

### 2) Server (Express + Prisma)

```bash
cd server
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Health check:

- GET http://localhost:3000/health

### 3) Client (Vite + React)

```bash
cd client
npm install
npm run dev
```

