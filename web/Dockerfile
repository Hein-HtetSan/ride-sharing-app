# Multi-stage build for React Web Frontend
FROM node:20 AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production Nginx image
FROM nginx:alpine


# Copy built files to Nginx (for Create React App default build output)
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
