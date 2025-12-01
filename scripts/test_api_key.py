"""
Quick script to test an OpenAI API key against gpt-5-nano.

Usage:
  export OPENAI_API_KEY=sk-...
  python scripts/test_api_key.py
"""

import os
import json
import sys
import urllib.request


def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        sys.stderr.write("Missing OPENAI_API_KEY environment variable.\n")
        sys.exit(1)

    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-5-nano",
        "messages": [
            {"role": "system", "content": "You are a simple tester."},
            {"role": "user", "content": "Say hello."},
        ],
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {api_key}")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            print("Status:", resp.status)
            print("Response:", body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        sys.stderr.write(f"HTTPError {e.code}: {err_body}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
