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
    ├── profile.json      intro, about, education, interests, contact
    ├── projects.json     three project cards + the thread linking them
    ├── publications.json peer-reviewed papers
    ├── activities.json   conferences, talks, news
    └── awards.json       awards and scholarships
```

`index.html` contains no content of its own beyond section headings and empty
containers. Every piece of text a visitor reads is injected from `content/*.json`
at load time, so content can be updated without touching HTML or CSS.

## Updating content

1. Edit the relevant JSON file in `content/`.
2. Keep the existing keys — the renderer reads them by name and silently skips
   anything missing.
3. `activities` are sorted by `date` (descending) automatically; `date` accepts
   `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
4. Commit and push to `main`. GitHub Pages redeploys in about a minute.

### Section status

A content file can switch its section to a restrained "Coming soon" notice
without removing the section from the navigation:

```json
{ "status": "coming_soon", "note": "Text shown to visitors.", "awards": [] }
```

Remove `status` (or set it to anything else) once real entries are added.

### Images

Image fields are optional and empty by default. When a path is supplied the
page loads it; when it is empty or fails to load, the labelled placeholder
stays in place, so a missing file never breaks the layout.

## Local preview

`content/*.json` is fetched with `fetch()`, which browsers block on `file://`.
Serve the folder over HTTP instead, e.g.:

```sh
python3 -m http.server 8765
```

then open <http://localhost:8765/>.

## Publishing rules

Only content that has been checked for accuracy is published here. In
particular, performance figures, conference details and awards appear only
after their source has been confirmed; photographs appear only with the
permission of everyone shown or involved.

## Licence

Text and images © Te Xiao. Please ask before reusing them.
