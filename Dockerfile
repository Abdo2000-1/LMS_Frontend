# Stage 1: Build static assets
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Pass production API URL at build time:
#   docker build --build-arg VITE_API_BASE_URL=https://your-api.azurewebsites.net .
ARG VITE_API_BASE_URL=https://YOUR_APP_SERVICE.azurewebsites.net
ARG VITE_BASE_PATH=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
