# Multi-stage build for Spring Boot API
FROM maven:3.9.7-eclipse-temurin-21 AS build

WORKDIR /app

# Copy POM and source
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Use a different Alpine mirror for better connectivity
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install curl for health checks
RUN apk update && apk add --no-cache curl

# Copy the built JAR
COPY --from=build /app/target/api-0.0.1-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["java", "-jar", "app.jar"]
