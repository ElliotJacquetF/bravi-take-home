"""
Simple local weather API for testing Custom API tools.

Usage:
  python scripts/fake_weather_api.py

Endpoint:
  GET http://localhost:5001/weather?city=Paris
  Response: {"weather": "kinda cloudy in Paris"}
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json


class Handler(BaseHTTPRequestHandler):
  def _set_headers(self, status=200):
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    # Allow browser fetch from localhost
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()

  def do_OPTIONS(self):
    self._set_headers(200)
    self.wfile.write(json.dumps({"ok": True}).encode())

  def do_GET(self):
    parsed = urlparse(self.path)
    if parsed.path != "/weather":
      self._set_headers(404)
      self.wfile.write(json.dumps({"error": "not found"}).encode())
      return
    qs = parse_qs(parsed.query)
    city = qs.get("city", ["your city"])[0]
    payload = {"weather": f"kinda cloudy in {city}"}
    self._set_headers(200)
    self.wfile.write(json.dumps(payload).encode())


def run(server_class=HTTPServer, handler_class=Handler, port=5001):
  server_address = ("", port)
  httpd = server_class(server_address, handler_class)
  print(f"Serving fake weather API on http://localhost:{port}/weather?city=Paris")
  httpd.serve_forever()


if __name__ == "__main__":
  run()
