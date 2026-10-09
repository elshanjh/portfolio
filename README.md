# elshanjh.com

Personal site of Elshan Jabrayilzade, served by GitHub Pages from the `main` branch.

## How it is put together

- Every page is a plain HTML file. There is no build step: what is in this repository is what the site shows.
- `assets/site.css` and `assets/site.js` hold the design and behaviour shared by all pages.
- Portfolio pieces live inside `portfolio/lifecycle/index.html` and `portfolio/copywriting/index.html`, one `<article class="piece">` each.
- Stories keep their original addresses, for example `2025/08/06/a-horse-with-a-broken.html`.

## Changing text

Open any page on the live site with `?edit` at the end of the address, for example `https://elshanjh.com/about/?edit`.
Paste a GitHub token that can write to this repository, click "Edit this page", change the outlined text and press Save.
The editor (`assets/edit.js`) saves the page file straight to this repository.

Because the editor changes these HTML files directly, they are the source of truth. Always start from the latest version of this repository before making other changes.
