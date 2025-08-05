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

## Quick Start (Development - All in Docker)

### Option 1: Use the automated script (Recommended)
```sh
# Windows
scripts\start-dev.bat

# Linux/Mac/Git Bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```
This will:
- Start all services with live reload
- Automatically check when all services are ready
- Show you all service URLs

### Option 2: Manual start
```sh
docker-compose -f docker-compose.dev.yml up --build
```

### Check service status anytime:
```sh
# Windows
scripts\check-services.bat

# Linux/Mac/Git Bash
./scripts/check-services.sh
```

## Quick Start (Production - All in Docker)

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Hein-HtetSan/ride-sharing-app.git
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
   - **Production Web UI:** [http://localhost](http://localhost)
   - **Development Web UI:** [http://localhost:3000](http://localhost:3000)
   - **API & Swagger:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
   - **Database:** `localhost:5432` (user: `postgres`, password: `postgres`, db: `ride_sharing`)

---

## Development Scripts

We provide convenient scripts to manage your development environment:

### Windows (CMD/PowerShell)
```cmd
# Start development environment and wait for all services
scripts\start-dev.bat

# Check if all services are ready
scripts\check-services.bat
```

### Linux/Mac/Git Bash
```bash
# Start development environment and wait for all services
./scripts/start-dev.sh

# Check if all services are ready
./scripts/check-services.sh
```

The scripts will show:
- ✅ Database ready
- ✅ RMI Server ready  
- ✅ Spring Boot API ready (waits for dependency download and startup)
- ✅ React Web Frontend ready

**Note:** The API service may take 2-5 minutes to start as it downloads Maven dependencies and initializes Spring Boot. The script will show progress updates every 30 seconds.

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

### Development
```sh
# Stop development services
docker-compose -f docker-compose.dev.yml down

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build [service-name] -d

# View logs (all services)
docker-compose -f docker-compose.dev.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.dev.yml logs -f [service-name]
```

### Production
```sh
# Stop production services
docker-compose down

# Rebuild everything
docker-compose up --build

# View logs
docker-compose logs -f
```

### Service Names
- `database` - PostgreSQL database
- `rmi-server` - Java RMI server
- `api` - Spring Boot API
- `web` - React frontend
- `nginx` - Nginx reverse proxy (production only)

---

## Troubleshooting

### Common Issues
- **Services not starting:** Use the health check scripts to see which service is failing
- **Port conflicts:** Make sure ports 3000, 8080, 5432, and 1099 are available
- **Docker build errors:** Check Docker logs with `docker-compose logs [service-name]`
- **Database connection errors:** Ensure the database service is healthy before other services start

### Network Issues
- If you see Alpine package download errors, the scripts use reliable mirrors (Aliyun)
- If Maven dependencies fail to download, the API service includes DNS settings and Maven mirrors

### Development vs Production
- **Development:** Uses live reload, source mounting, separate ports (3000 for web)
- **Production:** Uses optimized builds, Nginx proxy, single entry point (port 80)

---

## Project Structure
```
├── api/              # Spring Boot backend
│   ├── src/          # Java source code
│   ├── pom.xml       # Maven dependencies
│   └── Dockerfile*   # Docker build files
├── rmi/              # Java RMI microservice
│   ├── src/          # Java RMI source code
│   ├── lib/          # JAR dependencies
│   ├── scripts/      # Build and run scripts
│   └── Dockerfile*   # Docker build files
├── web/              # React frontend (Vite + TypeScript)
│   ├── src/          # React components and pages
│   ├── package.json  # Node.js dependencies
│   └── Dockerfile*   # Docker build files
├── database/         # Database initialization
│   └── init.sql      # Database schema and seed data
├── nginx/            # Nginx reverse proxy config
│   └── nginx.conf    # Production proxy configuration
├── scripts/          # Development helper scripts
│   ├── start-dev.*   # Start development environment
│   └── check-services.* # Health check scripts
├── docker-compose.yml     # Production configuration
└── docker-compose.dev.yml # Development configuration
```

---

## License
MIT
