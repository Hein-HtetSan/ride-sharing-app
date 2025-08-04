# Ride Sharing App - Monorepo

This project is a full-stack ride sharing application with:
- **Spring Boot** API backend
- **Java RMI** microservice
- **PostgreSQL** database
- **React** frontend (Vite + TypeScript)
- **Nginx** reverse proxy
- **Docker Compose** for orchestration

---

## Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop) (with Compose)
- (Optional) [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) for local frontend dev

---

## Quick Start (Production - All in Docker)

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd ride-sharing-app
   ```

2. **Build and start all services:**
   ```sh
   docker-compose up --build
   ```
   This will build and start:
   - PostgreSQL database
   - RMI server
   - Spring Boot API
   - React frontend (served by Nginx)
   - Nginx reverse proxy

3. **Access the app:**
   - Web UI: [http://localhost](http://localhost)
   - API: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
   - Database: `localhost:5432` (user: `postgres`, password: `postgres`, db_name: `ride_sharing`)

---

## Development

### 1. Frontend (React)
- Go to the `web` folder:
  ```sh
  cd web
  npm install
  npm run dev
  ```
- Open [http://localhost:5173](http://localhost:5173) (or as shown in terminal)

### 2. Backend (Spring Boot API)
- Go to the `api` folder and use Maven:
  ```sh
  cd api
  ./mvnw clean install
  ./mvnw spring-boot:run
  ```
- API runs at [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

### 3. RMI Microservice
- Go to the `rmi` folder and build/run as needed (see Dockerfile for manual build steps)
 ```sh
 cd rmi
 .\scripts\start-server.bat # work on windows cmd

 # Configure postgres connection as needed - under /rmi/src/com/rsrmi/ride_sharing_api/rmi/config/DatabaseConfig.java
 # Install postgres driver if needed
 # create a database named `ride_sharing` in PostgreSQL
 # then, boom
 ```    
---

## Useful Commands
- **Stop all containers:**
  ```sh
  docker-compose down
  ```
- **Rebuild everything:**
  ```sh
  docker-compose up --build
  ```
- **View logs:**
  ```sh
  docker-compose logs -f
  ```

---

## Troubleshooting
- If the web UI does not load, ensure the React build output is present and Nginx is serving `/usr/share/nginx/html`.
- For local development, use the `web` service with `npm run dev` and connect to the API at `localhost:8080`.
- Database credentials are set in `docker-compose.yml` and can be changed as needed.

---

## Project Structure
```
api/        # Spring Boot backend
rmi/        # Java RMI microservice
web/        # React frontend (Vite)
database/   # DB init scripts
nginx/      # Nginx config
```

---

## License
MIT
