@echo off
echo Building...
if not exist build mkdir build
find src -name "*.java" | sort > sources.txt
javac -d build -cp "../lib/postgresql-42.7.7.jar;../lib/HikariCP-6.3.1.jar" @sources.txt
rm sources.txt

echo Starting RMI Server...
cd build
java com.rsrmi.ride_sharing_api.rmi.clients.UserServiceClient
cd ..

pause
