# Personal Resume Website

Static resume website with a modern timeline layout, theme switcher, mobile-friendly navigation, animated profile image lightbox, and content managed from a single file.

## Tech Stack

- HTML/CSS/JavaScript (no build step)
- Bootstrap 5 (CDN)
- Font Awesome + Devicon + Simple Line Icons (CDN)

## Quick Start

### 1) Run locally

Because this site uses separate JS files for content rendering, run it through a local web server (not `file://`).

Example:

```bash
python3 -m http.server 8000
```

Open:

- `http://localhost:8000`

### 2) Edit content

Main content is in:

- `content/resume-content.js`

This includes:

- About text
- Experience
- Education
- Skills
- Interests
- Awards

## Project Structure

- `index.html`: Page shell/layout
- `content/resume-content.js`: Editable resume content
- `js/content-renderer.js`: Renders content into sections
- `js/enhancements.js`: UI interactions (theme switcher, lightbox, scroll UI)
- `css/enhancements.css`: Custom styling and responsive behavior
- `img/`: Profile image + interests placeholders

## Editing Guide

### Experience entries

In `content/resume-content.js`:

```js
{
  title: "People & Transformation Lead",
  company: "Die Schweizerische Post AG",
  companyDomain: "post.ch",
  dateRange: "March 2025 - Today",
  bullets: [
    "..."
  ]
}
```

Notes:

- `companyDomain` is recommended for accurate company logo loading.
- Logos are auto-resolved with multiple providers and fallback handling.

### Interests section

Interests are structured as:

- `buckets`: Now / Always / Learning cards
- `photos`: Image slots with captions

Example:

```js
interests: {
  buckets: [
    { label: "Now", title: "...", why: "..." }
  ],
  photos: [
    { src: "img/your-photo.jpg", alt: "...", caption: "..." }
  ]
}
```

You can replace placeholder images in `img/` or just update `src` paths.

## Theme Switcher

Desktop + mobile theme dots provide 3 schemes:

1. Blue/White (default)
2. Green (`#8EA59D`)/White
3. Rose (`#A18089`)/White

Theme selection is stored in browser `localStorage`.

## Deployment

Deploy as static files (GitHub Pages, Netlify, Vercel static, any web server).

### Important: Cache busting

If updates (especially content JS) are not visible after deployment, clear CDN/browser cache or add a version query to script tags in `index.html`:

```html
<script src="content/resume-content.js?v=2026-02-28"></script>
```

Update the version whenever content changes.

## Accessibility Notes

- Profile image zoom supports keyboard (`Enter`/`Space`) and `Esc` to close.
- Mobile and desktop nav states are responsive and theme-aware.

## License

Personal project. Add your preferred license before publishing publicly.
