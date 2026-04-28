# Cookie Jar

A personal resilience tool inspired by David Goggins' concept of the "Cookie Jar" — a mental store of past challenges overcome that you can draw from during hard moments.

Built as a portfolio project for INFO 442.

---

## What it does

Users create **cookies** — each one a documented moment of difficulty survived. Every cookie has a title, a photo, and a written reflection. Cookies are organized into four categories (fully customizable):

- Proving Capability
- Surviving Rejection
- Endurance and Grit
- Identity Anchors

The main screen shows a card grid of all cookies. Clicking a card opens the full reflection. Everything can be edited inline — no separate edit screen.

## Features

- Upload photos by drag-and-drop, paste from clipboard, or file browser
- Auto-compresses photos (full: 1600px, thumbnail: 600px) before storing
- Inline editing — click Edit on any cookie, type, ⌘+Enter to save
- Filter cookies by category, search by title or reflection text
- Add, rename, and delete categories
- Export all data (cookies + photos) as a single JSON file
- Import a backup to restore or migrate data
- Keyboard shortcuts: `N` new cookie · `/` search · `Esc` close
- Fully responsive — works on mobile and desktop
- No backend, no login — all data stays in your browser

## Tech

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

- **Photos:** IndexedDB (handles large blobs)
- **Metadata:** localStorage (cookies + categories JSON)
- **Fonts:** Fraunces (serif) + Inter (sans) via Google Fonts

## Live site

[kelvynjoaquin11.github.io/cookie-jar](https://kelvynjoaquin11.github.io/cookie-jar)

## Run locally

```bash
npx serve .
# open http://localhost:3000
```

## Deploy

The site is hosted on GitHub Pages from the `main` branch. Any push to `main` updates the live site within ~60 seconds.

---

*Built with plain HTML/CSS/JS. Inspired by David Goggins' "Can't Hurt Me."*
