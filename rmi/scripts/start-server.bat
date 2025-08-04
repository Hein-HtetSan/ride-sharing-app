echo Starting RMI Server...
@echo off
setlocal
echo Building...
if not exist build mkdir build

REM Find all Java files in the correct source root and compile
dir /b /s src\com\rsrmi\ride_sharing_api\rmi\*.java > sources.txt
javac -d build -cp ".\lib\postgresql-42.7.7.jar;.\lib\HikariCP-6.3.1.jar;.\lib\slf4j-api-2.0.15.jar;.\lib\slf4j-simple-2.0.15.jar" @sources.txt
del sources.txt

echo Starting RMI Server...
set CLASSPATH=.\build;lib\postgresql-42.7.7.jar;lib\HikariCP-6.3.1.jar;lib\slf4j-api-2.0.15.jar;lib\slf4j-simple-2.0.15.jar
java -cp %CLASSPATH% com.rsrmi.ride_sharing_api.rmi.servers.RMIServer

pause