# VHarness-SRSI — Project Page

Project page for **VHarness-SRSI: Structured Recursive Self-Improvement for Video Understanding Harness**.

A static site with no build step: `index.html` + `static/`. It works on GitHub Pages and also opens straight from disk (`file://`).

## Layout

```
index.html                 page content (sections, tables, captions)
static/css/style.css       design tokens (light/dark), layout, components
static/js/main.js          interactive figures (D3 v7 from cdnjs)
static/data/               chart data; data.js bundles it for the page
static/images/             figures and example frames
```

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
