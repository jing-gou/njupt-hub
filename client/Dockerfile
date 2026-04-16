# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_UMAMI_SCRIPT_URL=${VITE_UMAMI_SCRIPT_URL}
ENV VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# 拷贝静态资源
COPY --from=build /app/dist /usr/share/nginx/html

# 拷贝 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
