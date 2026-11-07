# xt-waseda.github.io

Personal research & engineering homepage of Te Xiao, served by GitHub Pages at
<https://xt-waseda.github.io/>.

Plain HTML, CSS and JavaScript. No build step, no frameworks, no external
requests, no tracking, no cookies. Everything the browser needs is in this
repository.

> This is a personal website. It is **not** an official Waseda University page,
> and nothing here represents the official position of the university or any
> affiliated laboratory.

## Structure

```
.
├── index.html            single-page layout (all six sections)
├── 404.html              not-found page
├── .nojekyll             serve files as-is, skip Jekyll processing
├── assets/
│   ├── css/site.css      all styling (design tokens in :root)
│   └── js/site.js        reads content/*.json and renders the page
└── content/
    ├── site.json         banner, portrait, footer, page title
    ├── profile.json      intro, about, education, skills, contact
    ├── projects.json     three numbered research entries
    ├── publications.json published and accepted journal papers
    ├── activities.json   conference presentations
    └── awards.json       awards and scholarships
```

The HTML sets the layout, headings, and navigation. The renderer loads the
portfolio entries from `content/*.json`, so most content changes only require
editing the relevant JSON file.

## Updating content

1. Edit the relevant JSON file in `content/`.
2. Keep the existing keys — the renderer reads them by name and silently skips
   anything missing.
3. `activities` are sorted by `date` (descending) automatically; `date` accepts
   `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
4. Review the local preview. Publish to `main` only after the site owner approves
   the content.

### Section status

A content file can switch its section to a restrained "Coming soon" notice
without removing the section from the navigation:

```json
{ "status": "coming_soon", "note": "Text shown to visitors.", "awards": [] }
```

Remove `status` (or set it to anything else) once real entries are added.

### Publication and contact details

Use the published DOI URL for `publications[].link`. For an accepted paper,
set `status` to `Accepted` and leave the link unset until publication is
verified. List email addresses in `profile.contact.emails` after the site owner approves them for public use.

### Images

Use optimized local files under `assets/images/`. Set the relative paths
in `site.json` for the banner or portrait. For a publication thumbnail, set
the article’s `image` and `imageAlt` fields in `content/publications.json`.
The thumbnail appears only when the image loads. The banner falls back to its navy background, and the portrait keeps its
placeholder when an image is unavailable.

## Local preview

`content/*.json` is fetched with `fetch()`, which browsers block on `file://`.
Serve the folder over HTTP instead, e.g.:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open the local server in your browser on port 8765.

## Publishing rules

Only content that has been checked for accuracy is published here. In
particular, performance figures, conference details and awards appear only
after their source has been confirmed; photographs appear only with the
permission of everyone shown or involved.

## Licence

Text and images © Te Xiao. Please ask before reusing them.
