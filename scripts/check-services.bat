@echo off
echo Checking Ride Sharing App Services...
echo =====================================

:check_database
echo [1/4] Checking Database (PostgreSQL)...
docker exec ride-sharing-db-dev pg_isready -U postgres > nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Database is not ready
    timeout /t 5 /nobreak > nul
    goto check_database
) else (
    echo   ✅ Database is ready
)

:check_rmi
echo [2/4] Checking RMI Server...
curl -s --connect-timeout 3 telnet://localhost:1099 > nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ RMI Server is not ready
    timeout /t 5 /nobreak > nul
    goto check_rmi
) else (
    echo   ✅ RMI Server is ready
)

:check_api
echo [3/4] Checking Spring Boot API...
echo   ⏳ Waiting for Spring Boot to download dependencies and start...

set /a attempt=0
set /a max_attempts=60

:api_loop
set /a attempt+=1

REM Check if container is running first
docker ps --filter "name=ride-sharing-api-dev" --filter "status=running" | findstr "ride-sharing-api-dev" > nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ API container is not running
    timeout /t 5 /nobreak > nul
    goto api_loop
)

REM Check Spring Boot health endpoint
curl -s -f http://localhost:8080/health > nul 2>&1
if %errorlevel% neq 0 (
    if %attempt% lss %max_attempts% (
        set /a remainder=%attempt% %% 6
        if %remainder% equ 0 (
            echo   ⏳ Spring Boot still starting... (%attempt%/60 attempts)
        )
        timeout /t 5 /nobreak > nul
        goto api_loop
    ) else (
        echo   ❌ API health check timed out after 5 minutes
        echo   💡 Try checking logs: docker-compose -f docker-compose.dev.yml logs api
        goto check_web
    )
) else (
    echo   ✅ API is ready and healthy
)

:check_web
echo [4/4] Checking Web Frontend...
curl -s -f http://localhost:3000 > nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Web Frontend is not ready
    timeout /t 5 /nobreak > nul
    goto check_web
) else (
    echo   ✅ Web Frontend is ready
)

echo.
echo 🎉 All services are ready!
echo =====================================
echo Database:     http://localhost:5432
echo RMI Server:   rmi://localhost:1099
echo API:          http://localhost:8080
echo Web App:      http://localhost:3000
echo Swagger UI:   http://localhost:8080/swagger-ui.html
echo =====================================
pause
