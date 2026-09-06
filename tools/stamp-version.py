#!/usr/bin/env python3
"""Stamp a release version onto the asset URLs in index.html.

    python tools/stamp-version.py              # bump the version and stamp
    python tools/stamp-version.py --restamp    # re-apply the current version, no bump
    python tools/stamp-version.py --set 2026.09.06.4
    python tools/stamp-version.py --check      # report only, change nothing
    python tools/stamp-version.py --clear      # strip ?v= off css/js for local CSS work

The version is a date plus a same-day counter, e.g. 2026.09.06.2, and it lives in

    <meta name="version" content="...">

in index.html. That tag is the single source of truth. Nothing here reads git, which is
the point: the old commit-hash stamp could only ever name the *previous* commit, so
stamping and committing took two commits to line up. A version you bump yourself is part
of the same commit as the change it describes.

index.html only carries two asset URLs, for the stylesheet and the script. The JSON under
data/ is fetched by main.js, which reads the meta tag and appends the same ?v= to every
request - so one rewrite here covers all of them.
"""

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"

META = re.compile(r'(<meta\s+name="version"\s+content=")([^"]*)(">)')
# href/src pointing at a local .css or .js, with or without an existing stamp.
REF = re.compile(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"')


def read(html):
    m = META.search(html)
    if not m:
        sys.exit('no <meta name="version" content="..."> found in index.html')
    return m.group(2)


def next_version(current):
    """YYYY.MM.DD.N - N restarts at 1 each day, increments on same-day re-releases."""
    today = date.today().strftime("%Y.%m.%d")
    if current.startswith(today + "."):
        try:
            n = int(current.rsplit(".", 1)[1]) + 1
        except ValueError:
            n = 1
    else:
        n = 1
    return "%s.%d" % (today, n)


def main():
    args = sys.argv[1:]
    if not PAGE.exists():
        sys.exit("not found: %s" % PAGE)

    html = PAGE.read_text(encoding="utf-8")
    current = read(html)

    if "--check" in args:
        print("meta version: %s" % (current or "(empty)"))
        found = REF.findall(html)
        if not found:
            sys.exit("no css/js references found in index.html")
        for ref, stamp in found:
            print("  %s%s" % (ref.split('"', 1)[1], stamp or "   (unstamped)"))
        print("\ndata/*.json inherit the meta version at runtime, via main.js")
        return

    if "--clear" in args:
        out, count = REF.subn(r'\1"', html)
        # The meta stays put, so --restamp can put the stamps back without a bump.
        PAGE.write_text(out, encoding="utf-8", newline="")
        print("cleared %d asset stamp%s; meta version %s left in place"
              % (count, "" if count == 1 else "s", current))
        return

    if "--set" in args:
        try:
            version = args[args.index("--set") + 1]
        except IndexError:
            sys.exit("--set needs a version, e.g. --set 2026.09.06.4")
    elif "--restamp" in args:
        version = current
        if not version:
            sys.exit("meta version is empty - use --set or bump instead")
    else:
        version = next_version(current)

    out = META.sub(lambda m: m.group(1) + version + m.group(3), html, count=1)
    out, count = REF.subn(r'\1?v=%s"' % version, out)
    if not count:
        sys.exit("no css/js references found in index.html")

    PAGE.write_text(out, encoding="utf-8", newline="")

    moved = version != current
    print("version %s%s" % (version, "  (was %s)" % current if moved and current else ""))
    print("stamped %d asset reference%s; data/*.json inherit it at runtime"
          % (count, "" if count == 1 else "s"))


if __name__ == "__main__":
    main()
