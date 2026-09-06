# OpenPON

The website for the **Open PON Foundation** — [openpon.org](https://openpon.org/)

A vendor-neutral, volunteer effort for open, interoperable and privacy-respecting passive
optical networking. Static HTML, CSS and JavaScript. No build step, no dependencies, no
framework — upload the folder and it runs.

---

## Structure

```
index.html          all page markup
css/style.css       styles: light + dark, responsive, print
js/main.js          fetches /data and renders every section
data/*.json         all site content lives here
assets/             logo, banner, sponsor logo, share image
robots.txt          crawler rules + sitemap pointer
sitemap.xml         single-page sitemap
tools/              release helpers (not part of the site)
```

## Editing content

Every list on the page is driven by JSON in `data/`. Edit the file, reload the page, done —
no markup to touch.

| File             | Section on the page  |
| ---------------- | -------------------- |
| `firmware.json`  | Open Vendor Firmware |
| `devices.json`   | Supported Devices    |
| `countries.json` | Coverage             |
| `people.json`    | Key People           |
| `companies.json` | Supporters           |
| `suppliers.json` | Regional Suppliers   |

Notes:

* `firmware.json` — exactly one entry should carry `"featured": true`. It renders as the wide
  flagship card and is the only one that shows its `features` list.
* `devices.json` — `level` is `full` (green badge) or `good` (blue badge).
* `countries.json` — `region` groups the cards; the hero counter reads the array length, so
  adding a country updates the count automatically.
* `people.json` — `github` and `community` are optional. A `roles` entry containing "Lead"
  gets a highlighted tag.
* `companies.json` — `asn` and `website` are optional.
* `suppliers.json` — `contact` is optional: `{ "type", "value", "url" }`. `tier` sets the
  badge and the order within a region, and takes one of three values:

  | `tier`        | Badge                | Means                                                  |
  | ------------- | -------------------- | ------------------------------------------------------ |
  | `"msp"`       | Managed IT · MSP     | Takes the deployment end to end, procurement in the customer's name |
  | `"trade"`     | Trade supply         | A business selling hardware, deployment left to the buyer |
  | `"community"` | Community supply     | An individual supplying sticks and firmware help, voluntarily |

  Vendors sort `msp` → `trade` → `community` → untiered, so the turnkey options lead. The
  sort happens in `main.js`, not the file, so `suppliers.json` can stay in whatever order
  reads best — within a tier the authored order is preserved. Omit `tier` and the vendor
  renders as a plain card with no badge. An unrecognised value logs a `console.warn`
  naming the vendor, rather than silently dropping the badge. The optional `commitments`
  array renders as a checked list on any tier.

  The badge legend is hand-written in `index.html` above the regions; add a tier and it
  needs a legend row too.

The page reads these over `fetch`, so it **must be served over HTTP**. Opening `index.html`
straight off the disk shows a load error in every section.

## Local preview

```bash
python -m http.server 8000 --bind 0.0.0.0
```

Then <http://localhost:8000/>, or `http://<your-lan-ip>:8000/` from another device on the
network. Browsers cache `style.css` hard — use **Ctrl+F5** after editing CSS. JSON edits
need no such thing on localhost; see [Cache busting](#cache-busting).

## Cache busting

Every CSS, JS and JSON request carries a release version:

```
css/style.css?v=2026.09.06.1
js/main.js?v=2026.09.06.1
data/companies.json?v=2026.09.06.1
```

The version lives in one place, `index.html`:

```html
<meta name="version" content="2026.09.06.1">
```

`main.js` reads it from there and appends the same `?v=` to every `data/` request, so the
JSON is covered without being listed anywhere. Format is `YYYY.MM.DD.N`, where `N` restarts
at 1 each day and increments on same-day re-releases.

Bump and stamp in one step, then commit:

```bash
python tools/stamp-version.py
```

| Command                                    | Effect                                    |
| ------------------------------------------ | ----------------------------------------- |
| `python tools/stamp-version.py`            | bump the version and stamp                |
| `python tools/stamp-version.py --restamp`  | re-apply the current version, no bump     |
| `python tools/stamp-version.py --set X`    | set an explicit version                   |
| `python tools/stamp-version.py --check`    | report what is stamped, change nothing    |
| `python tools/stamp-version.py --clear`    | strip `?v=` off css/js for local CSS work |

**Why not the git commit hash.** The old script read `git rev-parse HEAD`, which can only
ever name the commit *before* the one you are making — so stamping and committing took two
commits to line up, and the stamp drifted whenever that second step was skipped. A version
you own is part of the same commit as the change it describes. One commit, always accurate.

`--clear` leaves the meta tag alone, so `--restamp` puts the stamps back without a bump.

### Local development

`main.js` skips the version entirely on `localhost`, `127.0.0.1` and `file:`, falling back to
`cache: no-cache` on the JSON. Editing `data/*.json` locally works without bumping anything.

Two things that follow from that:

* **CSS and JS are still stamped locally**, because those URLs are written into the HTML and
  cannot be made conditional. After a stylesheet edit, use **Ctrl+F5**, or run `--clear` while
  you work and `--restamp` when you are done.
* **LAN preview behaves like production.** Reaching the dev server on `192.168.x.x` from a
  phone takes the stamped path, so bump or `--clear` before testing data changes that way.

## Cloudflare

A version in the URL only helps if the cache key includes it, and if the HTML naming that
version is not itself stale. Both are Cloudflare settings, not something the site can fix on
its own.

**1. Do not cache `index.html`.** This is the one that breaks everything else. If the HTML is
held at the edge, visitors keep getting the old `<meta name="version">` and the old
`?v=` — so they keep getting the old CSS, JS and JSON no matter how many times you bump.
Serve it with `Cache-Control: no-cache` so it revalidates on every request.

**2. Check the cache level is Standard, not "Ignore Query String".** Standard makes the query
string part of the cache key, which is what makes `?v=` work. A Page Rule or Cache Rule set to
*Ignore Query String* strips it, and every version collapses onto the same cached object —
the most likely reason a JSON file stays stale after a bump.

**3. `.json` is not cached by Cloudflare by default.** It is not in the default static
extension list, so if JSON is being cached at all, a *Cache Everything* rule is putting it
there. That is fine and desirable with versioned URLs — just make sure rule 1 excludes the
HTML from it.

Suggested origin headers:

| Path                       | `Cache-Control`                          |
| -------------------------- | ---------------------------------------- |
| `/index.html`, `/`         | `no-cache`                               |
| `/css/`, `/js/`, `/data/`  | `public, max-age=31536000, immutable`    |
| `/robots.txt`, `/sitemap.xml` | `public, max-age=3600`                |

Those are safe *because* the URLs are versioned: a bump produces a new URL, so nothing has to
expire. Also check **Browser Cache TTL** in the Cloudflare dashboard — if it is set to a
fixed value it overrides the origin header on its way to the browser.

Purge the cache after a deploy while settings are being sorted out. Once rule 1 is in place it
stops being necessary, which is a good way to confirm it is working.

## Hero mesh animation

The animated backdrop is an inline SVG in `index.html`, styled entirely from `css/style.css`
(search `mesh`). It is a plexus network: 46 nodes wired to their nearest neighbours into 87
edges, with light streaks running the links.

* **Two depth planes.** `.mesh-far` renders dim and small, `.mesh-near` bright with a bloom
  halo. Depth is opacity, not a blur filter — a full-frame blur would re-rasterise on every
  animation frame.
* **Streaks** are `<use>` clones of nine polyline paths that walk the mesh node to node. Each
  path carries `pathLength="1000"`, so one `stroke-dasharray` works on all of them regardless
  of real length, and the travel is a `stroke-dashoffset` animation from `1000` to `0`.
* **Speed and phase** are inline per streak: `style="--dur: 3.4s; --delay: -0.5s"`. The delay
  is negative so each starts mid-flight instead of all nine firing together. The trailing
  glow derives its own lag from `--dur`, so changing the speed keeps the comet shape.
* **Colours** live in the `--mesh-*` tokens at the top of the stylesheet, one set per colour
  scheme.
* It pauses via `IntersectionObserver` once the hero scrolls out of view, and is hidden
  entirely under `prefers-reduced-motion: reduce`.

## SEO

Everything below is already in place. What is left is the part only the domain owner can do.

**In `index.html`:** title and meta description, `rel="canonical"`, a `robots` meta with
`max-image-preview:large`, and JSON-LD structured data (`Organization` + `WebSite`).

**In the repo root:** `robots.txt` and `sitemap.xml`.

**Coverage.** Google and Bing are the only two crawlers that need submitting to. Yahoo Search
has been served by Bing since 2009, and DuckDuckGo builds its index from its own DuckDuckBot
plus Bing — so verifying with those two consoles covers all four engines.

### After the domain goes live

1. **Google** — add the property in [Search Console](https://search.google.com/search-console),
   take the verification token, paste it into the commented `google-site-verification` meta in
   `index.html` and uncomment it. Then submit `https://openpon.org/sitemap.xml`.
2. **Bing** — same in [Bing Webmaster Tools](https://www.bing.com/webmasters), using the
   commented `msvalidate.01` meta. Bing can also import the property straight from Search
   Console, which skips the second verification.
3. Confirm `https://openpon.org/robots.txt` and `/sitemap.xml` both return 200.
4. Serve the site over HTTPS and pick one hostname — with or without `www` — redirecting the
   other to it. Two reachable hostnames split your ranking signals.

If the launch date moves, update `<lastmod>` in `sitemap.xml`.

## Link previews (SNS)

`index.html` carries full Open Graph and X/Twitter Card tags. Open Graph is what
Facebook, LinkedIn, Discord, Telegram, WhatsApp, Slack and Mastodon all read; X reads the
`twitter:` tags and falls back to Open Graph.

The share image is `assets/og-cover.png` (1024×512, 2:1), referenced by **absolute URL** —
relative paths are the usual reason a preview renders blank, since scrapers do not resolve
them. `og:image:width` / `og:image:height` are declared so the card lays out before the image
finishes downloading.

> **Worth upgrading:** Facebook and LinkedIn recommend at least 1200×630 for a crisp card.
> 1024×512 works everywhere and is above every minimum, but a 1200×630 export of the same
> artwork would render sharper. Drop it in as `assets/og-cover.png` and update the two
> `og:image:width` / `og:image:height` values.

Test a preview before announcing anywhere — each platform caches aggressively, and these
tools also force a re-scrape after you change the tags:

* [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
* [X Card Validator](https://cards-dev.twitter.com/validator)
* [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
* [Google Rich Results Test](https://search.google.com/test/rich-results) — for the JSON-LD

## Deploying

Run `python tools/stamp-version.py`, then upload `index.html`, `robots.txt`, `sitemap.xml`,
`css/`, `js/`, `data/` and `assets/` to the web root. Any static host will do. `data/` must
sit alongside `index.html` and stay publicly readable, or the page renders empty.

Some things in the repo are **not** part of the site and do not need uploading: `tools/`,
`ONF_TMP.png` and `perfect.png` at the root, and the `*.md` briefs plus `logo-mark.svg.old` currently inside
`assets/`. Anything under `assets/` is served, so those briefs would be publicly reachable —
`robots.txt` asks crawlers to skip them, but that only stops indexing, not access. Move them
out of `assets/` before deploying if they should not be public.

## Licence

GPL-2.0 — see [LICENSE](LICENSE).
