# Stage 1 — Angular build
FROM node:22-alpine AS build
WORKDIR /app

ARG API_URL=http://localhost:5000
ENV API_URL=$API_URL

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Inject API URL into environment file at build time
RUN sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" src/environments/environment.prod.ts

RUN npm run build -- --configuration production

# Stage 2 — nginx serving (non-root, port 8080)
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/sql-copilot/browser /usr/share/nginx/html

# OpenShift compatibility — nginx must not need root for pid/cache
RUN chown -R 1001:0 /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d && \
    chmod -R g=u /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown 1001:0 /var/run/nginx.pid && \
    chmod g=u /var/run/nginx.pid

USER 1001
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s \
  CMD wget -q --spider http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
