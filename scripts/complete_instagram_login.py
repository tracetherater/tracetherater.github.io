"""One-time local OAuth exchange for Meta Instagram Unified Login.

Run only on your own machine after visiting Meta's generated login URL:
    python scripts/complete_instagram_login.py

This script never writes credentials into a file or sends them to ChatGPT.
The returned token is shown only in your terminal for immediate transfer to
your private GitHub Actions secret INSTAGRAM_ACCESS_TOKEN.
"""
import getpass
import json
import urllib.error
import urllib.parse
import urllib.request

REDIRECT = "https://tracetherater.github.io/instagram-callback.html"
HOST = "https://graph.facebook.com/v26.0"


def graph_request(endpoint, form, token=None):
    data = urllib.parse.urlencode(form).encode("utf-8") if form is not None else None
    headers = {"Accept": "application/json", "User-Agent": "TraceTheRaterSetup/1.0"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(HOST + endpoint, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def main():
    print("Meta Unified Login: one-time setup for @tracetherater")
    print("Your app secret and authorization code stay on your computer.")
    app_id = input("Meta App ID: ").strip()
    app_secret = getpass.getpass("Meta App Secret (hidden): ").strip()
    code = getpass.getpass("Paste one-time authorization code (hidden): ").strip()
    if not app_id.isdigit() or not app_secret or not code:
        raise ValueError("App ID, app secret, and authorization code are required.")
    response = graph_request("/oauth/access_token", {
        "client_id": app_id,
        "client_secret": app_secret,
        "redirect_uri": REDIRECT,
        "code": code,
    })
    token = response.get("access_token", "")
    if not isinstance(token, str) or not token:
        raise RuntimeError("Meta did not return an access token.")
    try:
        assigned = graph_request(
            "/me/assigned_instagram_accounts?fields=id%2Cusername&limit=100",
            None, token,
        )
        accounts = assigned.get("data", [])
        usernames = [str(a.get("username", "")) for a in accounts if isinstance(a, dict)]
        print("Instagram accounts shared with this token: " + (", ".join(usernames) or "(none found)"))
        if "tracetherater" not in [u.lower() for u in usernames]:
            print("WARNING: @tracetherater is not assigned. Check portfolio and Instagram asset permissions.")
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError):
        print("Account lookup could not be verified. Check Instagram account sharing in Meta.")

    print("\nCopy the token below into GitHub Actions secret INSTAGRAM_ACCESS_TOKEN.")
    print("Do not paste it into a website file, public post, or ChatGPT.")
    print("\nACCESS TOKEN (KEEP PRIVATE):\n" + token + "\n")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        print(f"Meta returned HTTP {exc.code}. The code may have expired, been used, or not matched the exact redirect URI.")
    except (urllib.error.URLError, TimeoutError):
        print("Meta could not be reached. Check your internet connection and try again.")
    except (ValueError, RuntimeError) as exc:
        print(str(exc))
