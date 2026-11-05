"""Publish a safe, public Instagram media snapshot via Meta Unified Login.

Use a Business Integration System User access token, obtained through Meta's
Unified Login OAuth flow. Store it only as the GitHub Actions repository secret
INSTAGRAM_ACCESS_TOKEN; never place it in browser JavaScript or website files.

Unified Login uses graph.facebook.com and instagram_basic, *not* the legacy
graph.instagram.com / instagram_business_basic method.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "instagram-posts.json"
API = "https://graph.facebook.com/v26.0"
TARGET_USERNAME = "tracetherater"
# Account ID displayed by Meta in the developer dashboard, not a token.
EXPECTED_IG_ID = "17841449285051623"
FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"


def https_url(value):
    if not isinstance(value, str):
        return ""
    parsed = urllib.parse.urlparse(value)
    return value if parsed.scheme == "https" and parsed.netloc else ""


def fetch_graph(path, token, fields):
    query = urllib.parse.urlencode(fields)
    request = urllib.request.Request(
        API + path + "?" + query,
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "TraceTheRaterSite/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(
            f"Meta Graph API returned HTTP {error.code}; verify Unified Login token and instagram_basic permission."
        ) from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError("Could not retrieve Instagram data from Meta Graph API.") from None
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise RuntimeError("Meta API response did not include a data list.")
    return payload["data"]


def fetch_account(path, token):
    """Read account metadata, never exposing access credentials in logs."""
    request = urllib.request.Request(
        API + path + "?fields=id%2Cusername",
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "TraceTheRaterSite/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        print(f"Direct Instagram account lookup returned HTTP {error.code}.")
        return None
    except (urllib.error.URLError, TimeoutError, ValueError):
        print("Direct Instagram account lookup could not complete.")
        return None
    return data if isinstance(data, dict) else None


def public_post(item):
    permalink = https_url(item.get("permalink"))
    if urllib.parse.urlparse(permalink).hostname not in ("instagram.com", "www.instagram.com"):
        return None
    return {
        "caption": str(item.get("caption") or "")[:500],
        "mediaType": str(item.get("media_type") or ""),
        "mediaUrl": https_url(item.get("media_url")),
        "thumbnailUrl": https_url(item.get("thumbnail_url")),
        "permalink": permalink,
        "timestamp": str(item.get("timestamp") or ""),
    }


def date_key(post):
    try:
        return datetime.fromisoformat(post["timestamp"].replace("Z", "+00:00")).timestamp()
    except (ValueError, OverflowError):
        return 0


def main():
    token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not token:
        print("No Unified Login access token configured; leaving saved posts unchanged.")
        return

    accounts = fetch_graph("/me/assigned_instagram_accounts", token, {
        "fields": "id,username", "limit": 100,
    })
    print(f"Unified Login returned {len(accounts)} assigned Instagram account(s).")
    matched = [
        account for account in accounts
        if str(account.get("username", "")).casefold() == TARGET_USERNAME
        and str(account.get("id", "")).isdigit()
    ]
    if len(matched) == 1:
        account_id = matched[0]["id"]
    else:
        # Some same-portfolio Unified Login tokens report no assigned accounts.
        # Try the account ID listed in Meta's dashboard, but accept it only if
        # Meta authorizes reading the profile and confirms the username.
        account = fetch_account("/" + EXPECTED_IG_ID, token)
        if (
            account is not None
            and str(account.get("id", "")) == EXPECTED_IG_ID
            and str(account.get("username", "")).casefold() == TARGET_USERNAME
        ):
            print("Instagram account verified by direct Graph API lookup.")
            account_id = EXPECTED_IG_ID
        else:
            raise RuntimeError(
                "Token cannot access @tracetherater through assigned accounts or "
                "direct account lookup. In Meta Business Settings, check the "
                "portfolio's Instagram account and system-user asset access. "
                "If using Unified Login, reconnect and select the portfolio "
                "that owns @tracetherater."
            )
    items = fetch_graph(f"/{account_id}/media", token, {"fields": FIELDS, "limit": 15})
    posts = [post for item in items if (post := public_post(item))]
    posts.sort(key=date_key, reverse=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({"posts": posts[:6]}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Updated Instagram feed with {min(len(posts), 6)} posts.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
