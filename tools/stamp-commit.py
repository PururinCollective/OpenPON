#!/usr/bin/env python3
"""Stamp the current git commit onto the CSS and JS links in index.html.

    python tools/stamp-commit.py            # stamp with the current short HEAD
    python tools/stamp-commit.py --check    # report only, change nothing
    python tools/stamp-commit.py --clear    # strip every stamp back off

Turns

    <link rel="stylesheet" href="css/style.css">
    <script src="js/main.js"></script>

into

    <link rel="stylesheet" href="css/style.css?commit=939577f">
    <script src="js/main.js?commit=939577f"></script>

The JSON files under data/ are not listed here on purpose: main.js reads the stamp off
its own script tag and appends it to every data request, so this one rewrite covers them
too. Run it before uploading, then upload.

Note the stamp is HEAD at the time you run it, so stamping and then committing leaves the
page naming the previous commit. That is harmless - the value only has to change whenever
the content does - but if you want them to line up, stamp after committing, or re-run this
and amend.
"""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"

# href/src pointing at a local .css or .js, with or without an existing stamp.
REF = re.compile(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?commit=[^"]*)?"')


def short_head():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(ROOT), capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError) as exc:
        sys.exit("could not read the git commit: %s" % exc)


def main():
    args = sys.argv[1:]
    check = "--check" in args
    clear = "--clear" in args

    if not PAGE.exists():
        sys.exit("not found: %s" % PAGE)

    html = PAGE.read_text(encoding="utf-8")
    found = REF.findall(html)
    if not found:
        sys.exit("no css/js references found in index.html")

    if check:
        for ref, stamp in found:
            print("%s%s" % (ref.split('"', 1)[1], stamp or "   (unstamped)"))
        return

    if clear:
        stamped, count = REF.subn(r'\1"', html)
        commit = None
    else:
        commit = short_head()
        stamped, count = REF.subn(r'\1?commit=%s"' % commit, html)

    if stamped != html:
        PAGE.write_text(stamped, encoding="utf-8", newline="")

    verb = "cleared" if clear else "stamped"
    print("%s %d reference%s in index.html%s"
          % (verb, count, "" if count == 1 else "s",
             "" if clear else " with %s" % commit))


if __name__ == "__main__":
    main()
