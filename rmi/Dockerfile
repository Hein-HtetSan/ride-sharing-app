
# RMI Server Dockerfile using manual javac build
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Install build tools
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
RUN apk update && apk add --no-cache bash findutils coreutils

# Copy source, lib, and scripts
COPY src ./src
COPY lib ./lib
COPY scripts ./scripts

# Build Java sources
RUN find src -name "*.java" | sort > sources.txt \
    && javac -d build -cp "./lib/postgresql-42.7.7.jar:./lib/HikariCP-6.3.1.jar:./lib/slf4j-api-2.0.15.jar:./lib/slf4j-simple-2.0.15.jar" @sources.txt

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy built classes and libs
COPY --from=build /app/build ./build
COPY --from=build /app/lib ./lib
COPY --from=build /app/scripts ./scripts

# Expose RMI port
EXPOSE 1099

# Set JVM options for RMI
ENV RMI_HOSTNAME=rmi-server
ENV JAVA_OPTS="-Djava.rmi.server.hostname=${RMI_HOSTNAME} -Djava.net.preferIPv4Stack=true"

# Health check (optional, adjust class if needed)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
#   CMD java -cp "./build:./lib/*" com.rsrmi.ride_sharing_api.rmi.health.HealthCheck || exit 1

# Make sure the script is executable and use it as the entrypoint
RUN chmod +x ./scripts/start-server.sh
CMD ["sh", "./scripts/start-server.sh"]