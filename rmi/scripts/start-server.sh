#!/bin/sh
set -e

echo "Starting RMI Server..."

# Set classpath: build dir + all jars in lib
echo "Building..."
if [ ! -d build ]; then
  mkdir build
fi

# Find all Java files in the correct source root and compile
find src/com/rsrmi/ride_sharing_api/rmi -name '*.java' > sources.txt
javac -d build -cp "./lib/postgresql-42.7.7.jar:./lib/HikariCP-6.3.1.jar:./lib/slf4j-api-2.0.15.jar:./lib/slf4j-simple-2.0.15.jar" @sources.txt
rm sources.txt

exec java $JAVA_OPTS -cp "$CLASSPATH" com.rsrmi.ride_sharing_api.rmi.servers.RMIServer
CLASSPATH="./build:./lib/*"
