@echo off
echo Starting Ride Sharing App Development Environment...
echo ==================================================

echo Starting Docker Compose services...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo Waiting for services to start...
echo Running health checks...

call scripts\check-services.bat

echo.
echo To stop all services, run:
echo   docker-compose -f docker-compose.dev.yml down
echo.
echo To view logs:
echo   docker-compose -f docker-compose.dev.yml logs -f [service-name]
echo.
echo Services:
echo - database: PostgreSQL database
echo - rmi-server: RMI server for backend logic
echo - api: Spring Boot REST API
echo - web: React frontend application
