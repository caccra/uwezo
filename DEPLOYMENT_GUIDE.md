# Deployment Guide - Uwezo Security

Follow these steps to deploy your professional security website to the web.

## 1. Deploy via Netlify (Recommended)
Netlify is the fastest way to deploy static websites with zero configuration.

1. **Sign Up**: Create a free account at [Netlify](https://www.netlify.com/).
2. **Drag & Drop**: In the Netlify dashboard, simply drag your project folder onto the "Deploy" area.
3. **Configure Domain**: Netlify will provide a random URL (e.g., `uwezo-security.netlify.app`). You can link a custom domain (like `uwezo.ug`) in the domain settings.
4. **HTTPS**: Netlify automatically provides free SSL (HTTPS) for your site.

## 2. Deploy via Vercel
1. **Install CLI**: `npm i -g vercel`
2. **Deploy**: Run `vercel` in your project directory and follow the prompts.

## 3. Deploy via GitHub Pages
1. **Create Repository**: Push your code to a new public GitHub repository.
2. **Settings**: Go to `Settings > Pages`.
3. **Source**: Select `Deploy from a branch` and choose `main` / `root`.
4. **Save**: Your site will be live at `username.github.io/uwezo-security-landing`.

## 4. Final Checklist
- [ ] Ensure all images (`hero_tactical_kampala.png`, etc.) are in the root directory.
- [ ] Verify `theme.js` is linked correctly at the bottom of all HTML files.
- [ ] Check links between `index.html`, `about.html`, and `services.html`.
