# 1 段目: node でビルドする
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build
USER root
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# 2 段目: できた dist/ を nginx で配る
FROM registry.access.redhat.com/ubi9/nginx-124:latest
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
USER 1001
ENTRYPOINT ["nginx", "-g", "daemon off;"]
