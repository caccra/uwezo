const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: terserMinify } = require('terser');
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const DIST = path.join(__dirname, 'dist');

// HTML minifier options
const htmlOpts = {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
};

async function build() {
    // Clean and recreate dist
    if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
    fs.mkdirSync(DIST);

    // Copy static assets (images, logo, fonts, etc.)
    const staticDirs = ['images'];
    for (const dir of staticDirs) {
        const src = path.join(SRC, dir);
        if (fs.existsSync(src)) copyDir(src, path.join(DIST, dir));
    }
    const staticFiles = ['logo_new.png', 'netlify.toml'];
    for (const f of staticFiles) {
        const src = path.join(SRC, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
    }

    // Minify CSS
    const cssInput = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
    const cssOutput = new CleanCSS({ level: 2 }).minify(cssInput).styles;
    fs.writeFileSync(path.join(DIST, 'index.css'), cssOutput);
    console.log('✓ index.css minified');

    // Minify JS
    const jsFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.js') && f !== 'build.js');
    for (const jsFile of jsFiles) {
        const input = fs.readFileSync(path.join(SRC, jsFile), 'utf8');
        const result = await terserMinify(input, { compress: true, mangle: true });
        fs.writeFileSync(path.join(DIST, jsFile), result.code);
        console.log(`✓ ${jsFile} minified`);
    }

    // Minify HTML
    const htmlFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
    for (const htmlFile of htmlFiles) {
        const input = fs.readFileSync(path.join(SRC, htmlFile), 'utf8');
        const output = await minify(input, htmlOpts);
        fs.writeFileSync(path.join(DIST, htmlFile), output);
        console.log(`✓ ${htmlFile} minified`);
    }

    console.log('\nBuild complete → dist/');
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

build().catch(err => { console.error(err); process.exit(1); });
