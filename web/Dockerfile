# Multi-stage build for React Web Frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Accept build arguments for production environment variables
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_FRONTEND_URL
ARG VITE_ORS_API_KEY
ARG VITE_REACT_APP_GOOGLE_MAPS_API_KEY
ARG VITE_GRAPHHOPPER_API_KEY

# Build the app with production environment variables
RUN VITE_API_URL=${VITE_API_URL} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_FRONTEND_URL=${VITE_FRONTEND_URL} \
    VITE_ORS_API_KEY=${VITE_ORS_API_KEY} \
    VITE_REACT_APP_GOOGLE_MAPS_API_KEY=${VITE_REACT_APP_GOOGLE_MAPS_API_KEY} \
    VITE_GRAPHHOPPER_API_KEY=${VITE_GRAPHHOPPER_API_KEY} \
    NODE_ENV=production \
    npm run build

# Production Nginx image (npm is NOT needed in this stage)
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Only static files are copied from the build stage; npm is not required here.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
