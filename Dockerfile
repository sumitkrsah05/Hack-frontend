# Stage 1: build the Vite app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG BASE44_LEGACY_SDK_IMPORTS=false
ENV BASE44_LEGACY_SDK_IMPORTS=$BASE44_LEGACY_SDK_IMPORTS

RUN npm run build

# Stage 2: serve the static build with nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
