FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# 生成 Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
