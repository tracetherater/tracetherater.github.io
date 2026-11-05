"""Create a public Instagram feed without ever publishing the API token.

Configure GitHub Actions secret INSTAGRAM_ACCESS_TOKEN using the Meta dashboard.
The Instagram Professional account must have instagram_business_basic permission.
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
FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
API = "https://graph.instagram.com/me/media"


def https_url(value):
    if not isinstance(value, str):
        return ""
    parsed = urllib.parse.urlparse(value)
    return value if parsed.scheme == "https" and parsed.netloc else ""


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


def main():
    token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not token:
        print("Instagram token not configured; leaving previous snapshot unchanged.")
        return

    query = urllib.parse.urlencode({"fields": FIELDS, "limit": 15})
    # A header rather than a URL query string keeps the secret out of URLs/logs.
    request = urllib.request.Request(
        API + "?" + query,
        headers={"Authorization": "Bearer " + token,
                 "User-Agent": "TraceTheRaterSite/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Instagram API returned HTTP {error.code}; check token validity and permissions.") from None
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise RuntimeError("Could not retrieve Instagram media.") from None

    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise RuntimeError("Instagram API response did not contain a media list.")

    posts = [p for raw in payload["data"] if (p := public_post(raw))]
    def date_key(post):
        try:
            return datetime.fromisoformat(post["timestamp"].replace("Z", "+00:00")).timestamp()
        except (ValueError, OverflowError):
            return 0
    posts.sort(key=date_key, reverse=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"posts": posts[:6]}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated public Instagram preview ({min(len(posts),6)} posts).")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
