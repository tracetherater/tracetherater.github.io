import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path


FEEDS = (
    (
        "YouTube",
        "https://www.youtube.com/feeds/videos.xml?channel_id=UC4CniKU4t3gQhY4vRvqttBg",
    ),
    ("Reddit", "https://www.reddit.com/r/tracetherater/.rss"),
)
POSTS_PER_FEED = 3
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "latest-posts.json"
USER_AGENT = "TraceTheRaterSite/1.0 (+https://tracetherater.github.io/)"


class HTMLText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def local_name(tag):
    return tag.rsplit("}", 1)[-1].lower()


def child_text(element, names):
    for child in element:
        if local_name(child.tag) in names:
            value = "".join(child.itertext()).strip()
            if value:
                return value
    return ""


def clean_summary(value):
    parser = HTMLText()
    parser.feed(value)
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()[:280]


def parse_date(value):
    if not value:
        return ""
    try:
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec="seconds")
    except (TypeError, ValueError, OverflowError):
        return ""


def fetch_feed(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status != 200:
                    raise RuntimeError(f"Feed returned HTTP {response.status}: {url}")
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise RuntimeError(f"Feed returned HTTP {error.code}: {url}") from error
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == 2:
                raise RuntimeError(f"Could not fetch feed {url}: {error}") from error
        time.sleep(2**attempt)
    raise RuntimeError(f"Could not fetch feed: {url}")


def entry_link(entry, feed_url):
    for child in entry:
        if local_name(child.tag) == "link":
            value = child.attrib.get("href") or "".join(child.itertext()).strip()
            if value:
                url = urllib.parse.urljoin(feed_url, value)
                if urllib.parse.urlsplit(url).scheme in ("http", "https"):
                    return url
    return ""


def parse_feed(source, url, document):
    root = ET.fromstring(document)
    entries = [node for node in root.iter() if local_name(node.tag) in ("item", "entry")]
    posts = []
    for entry in entries:
        title = child_text(entry, {"title"})
        link = entry_link(entry, url)
        if not title or not link:
            continue
        summary = child_text(entry, {"description", "summary", "encoded", "content"})
        published = child_text(entry, {"pubdate", "published", "updated", "date"})
        posts.append(
            {
                "source": source,
                "title": title,
                "url": link,
                "publishedAt": parse_date(published),
                "summary": clean_summary(summary),
            }
        )
    posts.sort(key=lambda post: post["publishedAt"], reverse=True)
    return posts[:POSTS_PER_FEED]


def main():
    posts = []
    for source, url in FEEDS:
        posts.extend(parse_feed(source, url, fetch_feed(url)))
    posts.sort(key=lambda post: post["publishedAt"], reverse=True)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({"posts": posts}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(posts)} recent posts to {OUTPUT}")


if __name__ == "__main__":
    try:
        main()
    except (ET.ParseError, OSError, RuntimeError, urllib.error.URLError) as error:
        print(f"Unable to update recent posts: {error}", file=sys.stderr)
        sys.exit(1)
