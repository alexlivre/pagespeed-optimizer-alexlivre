#!/usr/bin/env node

/**
 * Native Batch Image Converter & Responsive <picture> Generator
 * Converts JPG/PNG images to modern WebP and AVIF formats for 100/100 Core Web Vitals.
 * Part of pagespeed-optimizer-alexlivre (https://alexlivre.dev/)
 *
 * Usage:
 *   node scripts/convert-images.mjs [directory] [--quality=80]
 * Examples:
 *   node scripts/convert-images.mjs ./public/images
 *   node scripts/convert-images.mjs ./demo-page/public
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[36m========================================================\x1b[0m
\x1b[1m Batch Image Converter (pagespeed-optimizer-alexlivre)\x1b[0m
\x1b[36m========================================================\x1b[0m

Usage:
  node scripts/convert-images.mjs [directory] [--quality=80]

Arguments:
  [directory]       Target directory containing images (default: ./public or .)
  --quality=<num>   Compression quality from 1-100 (default: 80)
  --help, -h        Show this help documentation
`);
  process.exit(0);
}

let targetDir = '.';
let quality = 80;

for (const arg of args) {
  if (arg.startsWith('--quality=')) {
    const parsed = parseInt(arg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      quality = parsed;
    }
  } else if (!arg.startsWith('--')) {
    targetDir = arg;
  }
}

const resolvedDir = path.resolve(process.cwd(), targetDir);

function findImages(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    return [dir];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findImages(fullPath, fileList);
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function run() {
  console.log(`\x1b[36mSearching for legacy images in:\x1b[0m ${resolvedDir}`);
  const images = findImages(resolvedDir);

  if (images.length === 0) {
    console.log(`\x1b[32m✓ No legacy PNG/JPG images found. All images appear to be modern (WebP/AVIF/SVG) or directory is empty.\x1b[0m\n`);
    return;
  }

  console.log(`Found \x1b[33m${images.length}\x1b[0m image(s) to optimize.\n`);

  // Attempt dynamic import of sharp for high-speed native transformation
  let sharp = null;
  try {
    const mod = await import('sharp');
    sharp = mod.default || mod;
  } catch {
    sharp = null;
  }

  if (!sharp) {
    console.warn(`\x1b[33m[Notice]\x1b[0m 'sharp' is not installed locally. Generating actionable optimization instructions...\n`);
    console.log(`Found the following unoptimized image assets:`);
    for (const img of images) {
      const rel = path.relative(process.cwd(), img);
      const sizeKB = (fs.statSync(img).size / 1024).toFixed(1);
      console.log(`  - \x1b[36m${rel}\x1b[0m (${sizeKB} KB)`);
    }

    console.log(`\n\x1b[1mTo convert automatically in one step:\x1b[0m`);
    console.log(`  Run: \x1b[32mnpm install -D sharp\x1b[0m`);
    console.log(`  Then re-run: \x1b[32mnode scripts/convert-images.mjs ${targetDir}\x1b[0m\n`);
    console.log(`Or convert individually via npx:`);
    for (const img of images.slice(0, 3)) {
      const baseName = img.replace(/\.[^/.]+$/, '');
      console.log(`  npx -y sharp-cli -i "${img}" -o "${baseName}.webp" --format webp`);
      console.log(`  npx -y sharp-cli -i "${img}" -o "${baseName}.avif" --format avif`);
    }

    printPictureSnippet(images[0]);
    return;
  }

  // Sharp is installed: execute conversion
  console.log(`\x1b[32mConverting images with sharp (quality: ${quality})...\x1b[0m\n`);
  for (const img of images) {
    const ext = path.extname(img);
    const baseName = img.slice(0, -ext.length);
    const webpPath = `${baseName}.webp`;
    const avifPath = `${baseName}.avif`;
    const origSize = fs.statSync(img).size;

    try {
      await sharp(img).webp({ quality }).toFile(webpPath);
      await sharp(img).avif({ quality: Math.max(50, quality - 10) }).toFile(avifPath);

      const webpSize = fs.statSync(webpPath).size;
      const avifSize = fs.statSync(avifPath).size;

      const webpSavings = (((origSize - webpSize) / origSize) * 100).toFixed(1);
      const avifSavings = (((origSize - avifSize) / origSize) * 100).toFixed(1);

      console.log(`✓ \x1b[32m${path.basename(img)}\x1b[0m`);
      console.log(`   → WebP: ${(webpSize / 1024).toFixed(1)} KB (-${webpSavings}%)`);
      console.log(`   → AVIF: ${(avifSize / 1024).toFixed(1)} KB (-${avifSavings}%)`);
    } catch (err) {
      console.error(`✗ Failed to convert ${img}:`, err.message);
    }
  }

  printPictureSnippet(images[0]);
}

function printPictureSnippet(samplePath) {
  const rel = path.relative(process.cwd(), samplePath).replace(/\\/g, '/');
  const baseRel = rel.replace(/\.[^/.]+$/, '');
  console.log(`\n\x1b[1mRecommended <picture> Responsive Pattern for HTML/JSX:\x1b[0m`);
  console.log(`--------------------------------------------------------`);
  console.log(`<picture>
  <source srcset="${baseRel}.avif" type="image/avif">
  <source srcset="${baseRel}.webp" type="image/webp">
  <img
    src="${baseRel}.webp"
    alt="Descriptive alternative text"
    width="1200"
    height="675"
    fetchpriority="high"
    loading="eager"
    decoding="async"
    style="width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover;"
  >
</picture>`);
  console.log(`--------------------------------------------------------\n`);
}

run();
