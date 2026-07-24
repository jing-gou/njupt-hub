# Server

## Environment

Create `.env` based on `.env.example`.

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

Email options:

- `SMTP_PORT` (default `465`)
- `SMTP_SECURE` (defaults to `true` for port `465`)
- `SMTP_FROM` (defaults to `SMTP_USER`)

Optional:

- `PORT` (default 3000)

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Run

```bash
npm run dev
```

## API

### POST /api/auth/register

Body:

```json
{ "username": "alice", "password": "pass123", "email": "alice@example.com" }
```

### POST /api/auth/login

Body:

```json
{ "username": "alice", "password": "pass123" }
```

### GET /api/resources

Query (optional):

- `course` `category` `status` `q` `uploaderId` `page` `pageSize` `sort`(`createdAt|downloadCount`) `order`(`asc|desc`)

### POST /api/resources

Header:

- `Authorization: Bearer <token>`

Body:

```json
{ "title": "xxx", "description": "optional", "fileUrl": "https://...", "course": "数据结构" }
```

### POST /api/resources/upload

Header:

- `Authorization: Bearer <token>`

Body (multipart/form-data):

- `course`: string
- `category`: string (optional)
- `files`: multiple files
- `titles`: optional, repeatable (one title per file, order matters)

### PATCH /api/resources/:id/status

Header:

- `Authorization: Bearer <token>` (role must be ADMIN/DEV)

Body:

```json
{ "status": "APPROVED" }
```

### POST /api/resources/:id/download

Increments `downloadCount`.
