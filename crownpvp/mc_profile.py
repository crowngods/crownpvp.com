#!/usr/bin/env python3
"""Look up a Minecraft username's public Mojang profile (name and UUID only)."""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


USERNAME = re.compile(r"^[A-Za-z0-9_]{3,16}$")
UUID_HEX = re.compile(r"^[0-9a-fA-F]{32}$")
PROFILE_URL = "https://api.mojang.com/users/profiles/minecraft/"


def lookup(username):
    if not USERNAME.fullmatch(username):
        raise ValueError("Username must be 3-16 letters, numbers, or underscores.")

    request = urllib.request.Request(
        PROFILE_URL + urllib.parse.quote(username, safe=""),
        headers={"User-Agent": "CrownPVP public profile lookup"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status == 204:
                return None
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code in (204, 404):
            return None
        if error.code == 429:
            raise RuntimeError("The profile service rate-limited this lookup. Try again later.") from error
        raise RuntimeError(f"The profile service returned HTTP {error.code}.") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise RuntimeError(f"Could not reach the public profile service: {error}") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError("The profile service returned an unreadable response.") from error

    if not isinstance(payload, dict):
        raise RuntimeError("The profile service returned an invalid response.")
    profile_id = str(payload.get("id", ""))
    if not UUID_HEX.fullmatch(profile_id):
        raise RuntimeError("The profile service returned an invalid UUID.")
    uuid = (
        f"{profile_id[:8]}-{profile_id[8:12]}-{profile_id[12:16]}-"
        f"{profile_id[16:20]}-{profile_id[20:]}"
    ).lower()
    return {"username": str(payload.get("name", username)), "uuid": uuid}


def main():
    parser = argparse.ArgumentParser(
        description="Look up a public Minecraft profile by username. Does not trace IPs or alts."
    )
    parser.add_argument("username", nargs="?", help="Minecraft username")
    args = parser.parse_args()
    username = args.username or input("Minecraft username: ").strip()
    try:
        profile = lookup(username)
    except (ValueError, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    if profile is None:
        print(f"No public Minecraft profile found for {username}.")
        return 1

    print(f"Username: {profile['username']}")
    print(f"UUID:     {profile['uuid']}")
    print("Source:   Mojang public profile API")
    print("IP/alts:  Not looked up")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
