#!/usr/bin/env bash
# Quick test script to validate the fake weather API server.
# Usage:
#   bash scripts/test_custom_tool.sh

set -e

url="http://localhost:5001/weather?city=Paris"
echo "Testing GET $url"
response=$(curl -s -w "\nHTTP:%{http_code}\n" "$url")
echo "$response"

status=$(echo "$response" | tail -n1 | sed 's/HTTP://')
if [ "$status" != "200" ]; then
  echo "Expected 200, got $status"
  exit 1
fi

body=$(echo "$response" | head -n -1)
echo "Body: $body"
echo "Done."
