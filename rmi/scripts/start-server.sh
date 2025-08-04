#!/bin/sh
set -e

echo "Starting RMI Server..."

# Set classpath: build dir + all jars in lib
test -d build || mkdir build
CLASSPATH="./build:./lib/*"

exec java $JAVA_OPTS -cp "$CLASSPATH" com.rsrmi.ride_sharing_api.rmi.servers.RMIServer
