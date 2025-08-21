echo "Starting RMI Server..."
#!/bin/sh
set -e

echo "Starting RMI Server (production)..."

# Set classpath: build dir + all jars in lib
CLASSPATH="./build:./lib/*"

exec java $JAVA_OPTS -cp "$CLASSPATH" com.rsrmi.ride_sharing_api.rmi.servers.RMIServer
