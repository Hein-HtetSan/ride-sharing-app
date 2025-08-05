#!/bin/sh
set -e

echo "Building..."
[ -d build ] || mkdir build

find src -name "*.java" | sort > sources.txt
javac -d build -cp "./lib/*" @sources.txt
rm sources.txt

echo "Starting RMI Client..."
cd build
java -cp ".:./lib/*" com.rsrmi.ride_sharing_api.rmi.clients.UserServiceClient
cd ..
