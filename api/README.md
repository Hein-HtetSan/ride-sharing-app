# Ride Sharing API

This project is a Java Spring Boot API that communicates with RMI services for user and location management. It also includes RMI server and client code for local testing.

## Prerequisites
- Java 17 or later (Java 21 recommended)
- Maven (or use the included Maven Wrapper)

## Project Structure
- `src/main/java/com/rsrmi/ride_sharing_api/` — Spring Boot API code
- `src/main/java/com/rsrmi/ride_sharing_api/rmi/` — RMI interfaces, implementations, server, and clients
- `scripts/` — Batch scripts to build and run RMI server/clients

## 1. Build and Run the RMI Server
1. Open a terminal in the project root.
2. Run the RMI server build/start script:
   ```
   scripts\start-server.bat
   ```
   This will compile and start the RMI server on `localhost:1099`.

## 2. Build and Run the Spring Boot API
1. In a new terminal, from the project root, run:
   ```
   mvnw clean install
   mvnw spring-boot:run
   ```
   The API will start on `http://localhost:8080`.

## 3. Test the RMI Clients (Optional)
- To run a sample RMI client, use the provided batch scripts, e.g.:
  ```
  scripts\clients\start-user-client.bat
  scripts\clients\start-location-client.bat
  ```

## 3. Access Swagger UI
- Open [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) in your browser to explore the API.

## 4. Health Check
- Test the API health endpoint:
  - [http://localhost:8080/health](http://localhost:8080/health)

## 5. Build and Run RMI Clients (Optional)
- To run a sample RMI client, use the provided batch scripts, e.g.:
  ```
  scripts\clients\start-user-client.bat
  scripts\clients\start-location-client.bat
  ```

## Troubleshooting
- If you see `ClassNotFoundException` errors, ensure all dependencies are compiled (see the batch scripts for details).
- If you see `Connection refused` errors, make sure the RMI server is running before starting the API or clients.

## Notes
- The RMI server must be running before the Spring Boot API can connect to it.
- Adjust host/port/service names in the code or scripts if you change your setup.
