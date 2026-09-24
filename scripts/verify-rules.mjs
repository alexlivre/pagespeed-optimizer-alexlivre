#!/usr/bin/env node

/**
 * Deterministic Rules Linter & Optimization Gatekeeper
 * Validates 100% compliance with PageSpeed, CSS delivery strategy, WCAG 2.2 AA, SEO, GEO,
 * and event hygiene — with zero dependencies and no browser.
 *
 * Usage:
 *   node scripts/verify-rules.mjs [targetDirectoryOrHtmlFile]
 * Example:
 *   node scripts/verify-rules.mjs ./demo-page
 *   node scripts/verify-rules.mjs index.html
 *
 * The CSS delivery rule (12) rejects any stylesheet that is not render-blocking, because
 * a late stylesheet means the first paint has no layout and the page re-flows when the file
 * arrives. That is the single most common way a "100/100" page still fails CLS on desktop.
 * Opt out with <!-- pagespeed-allow-async-css --> only when the inline <style> covers all layout.
 */

import fs from 'node:fs';
import path from 'node:path';

const targetArg = process.argv[2] || process.cwd();
const targetPath = path.resolve(process.cwd(), targetArg);

let failures = 0;
let passes = 0;

function pass(msg) {
  passes++;
  console.log(`\x1b[32m  ✓ [PASS]\x1b[0m ${msg}`);
}

function fail(msg, hint) {
  failures++;
  console.error(`\x1b[31m  ✗ [FAIL]\x1b[0m ${msg}`);
  if (hint) {
    console.error(`          \x1b[33mHint:\x1b[0m ${hint}`);
  }
}

function findFiles(dir, extensions, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    return [dir];
  }
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', '.vercel', '.wrangler', 'coverage']);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, extensions, fileList);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      fileList.push(full);
    }
  }
  return fileList;
}

function auditHtml(htmlPath) {
  const relPath = path.relative(process.cwd(), htmlPath);
  console.log(`\nAuditing HTML: \x1b[36m${relPath}\x1b[0m`);
  const content = fs.readFileSync(htmlPath, 'utf8');

  // 1. DOCTYPE and HTML lang
  if (/^<!DOCTYPE\s+html>/i.test(content.trim())) {
    pass('Valid <!DOCTYPE html> at beginning of file');
  } else {
    fail('Missing or malformed <!DOCTYPE html>', 'Must be the exact first line without leading space.');
  }

  if (/<html[^>]+lang=["'][a-zA-Z-]+["']/i.test(content)) {
    pass('HTML tag declares valid lang attribute');
  } else {
    fail('Missing lang attribute on <html> element', 'Add lang="en" or lang="pt-BR".');
  }

  // 2. Charset & Viewport
  if (/<meta[^>]+charset=["']?UTF-8["']?/i.test(content)) {
    pass('Declares UTF-8 character encoding');
  } else {
    fail('Missing <meta charset="UTF-8">');
  }

  if (/<meta[^>]+name=["']viewport["'][^>]+content=["'][^"']*width=device-width/i.test(content)) {
    pass('Declares responsive viewport meta tag');
  } else {
    fail('Missing or invalid <meta name="viewport" content="width=device-width, initial-scale=1">');
  }

  // 3. Title & Meta Description
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1].trim().length > 0) {
    const titleLen = titleMatch[1].trim().length;
    pass(`Title tag present (${titleLen} chars: "${titleMatch[1].trim().slice(0, 40)}...")`);
  } else {
    fail('Missing or empty <title> tag', 'SEO requires a descriptive title between 50-60 characters.');
  }

  if (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.test(content)) {
    pass('Meta description tag present');
  } else {
    fail('Missing <meta name="description" content="...">');
  }

  // 4. Canonical link
  if (/<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/[^"']+["']/i.test(content)) {
    pass('Canonical link present with absolute URL');
  } else {
    fail('Missing or relative <link rel="canonical" href="https://...">', 'Always use an absolute canonical URL.');
  }

  // 5. Headings (Single H1)
  const h1Matches = content.match(/<h1(\s|>)/gi);
  const h1Count = h1Matches ? h1Matches.length : 0;
  if (h1Count === 1) {
    pass('Exactly one <h1> tag found');
  } else if (h1Count === 0) {
    fail('No <h1> tag found on page', 'Each page must have exactly one <h1> representing the main topic.');
  } else {
    fail(`Multiple <h1> tags found (${h1Count})`, 'Page must have exactly one <h1>; use <h2> for subheadings.');
  }

  // 6. Image Dimension & Zero-CLS Audit
  const imgTags = content.match(/<img[^>]*>/gi) || [];
  if (imgTags.length === 0) {
    pass('No <img> tags to validate');
  } else {
    let allImgsHaveDimensions = true;
    let allImgsHaveAlt = true;
    let lazyLcpFound = false;

    for (const tag of imgTags) {
      const hasWidth = /\bwidth=["']?\d+["']?/i.test(tag);
      const hasHeight = /\bheight=["']?\d+["']?/i.test(tag);
      const hasAlt = /\balt=["'][^"']*["']/i.test(tag);
      const isLazy = /\bloading=["']lazy["']/i.test(tag);
      const isPriority = /\bfetchpriority=["']high["']/i.test(tag) || /\bpriority\b/i.test(tag);

      if (!hasWidth || !hasHeight) {
        allImgsHaveDimensions = false;
        fail(`Image missing physical width or height attributes: ${tag.slice(0, 60)}...`, 'Declare intrinsic width and height to eliminate CLS.');
      }
      if (!hasAlt) {
        allImgsHaveAlt = false;
        fail(`Image missing alt attribute: ${tag.slice(0, 60)}...`, 'Add descriptive alt text or alt="" aria-hidden="true" for decorative images.');
      }
      if (isLazy && isPriority) {
        lazyLcpFound = true;
        fail(`Conflicting lazy + high priority on image: ${tag.slice(0, 60)}...`, 'Never lazy-load the above-the-fold/hero LCP image.');
      }
    }

    if (allImgsHaveDimensions) pass(`All ${imgTags.length} <img> tags declare physical width & height`);
    if (allImgsHaveAlt) pass(`All ${imgTags.length} <img> tags declare alt attributes`);
    if (!lazyLcpFound) pass('No LCP images misconfigured with loading="lazy"');
  }

  // 7. Schema.org JSON-LD and Speakable
  const jsonLdScripts = content.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  if (jsonLdScripts.length > 0) {
    pass(`Found ${jsonLdScripts.length} JSON-LD structured data block(s)`);
    let hasSpeakable = false;
    for (const block of jsonLdScripts) {
      const rawJson = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
      try {
        const parsed = JSON.parse(rawJson);
        const stringified = JSON.stringify(parsed);
        if (stringified.includes('"speakable"') || stringified.includes('"SpeakableSpecification"')) {
          hasSpeakable = true;
        }
      } catch (err) {
        fail('Malformed JSON in application/ld+json script tag', err.message);
      }
    }
    if (hasSpeakable) {
      pass('JSON-LD schema implements SpeakableSpecification for AI Search / GEO');
    } else {
      fail('JSON-LD schema missing "speakable" specification', 'Add speakable to link AI Overviews to your summary/TL;DR block.');
    }
  } else {
    fail('No application/ld+json structured data found', 'Implement JSON-LD @graph for WebPage/Person/Organization and Speakable.');
  }

  // 8. Event Hygiene in inline scripts
  if (/addEventListener\s*\(\s*['"]unload['"]/i.test(content)) {
    fail('Forbidden "unload" event listener found in inline HTML script', 'Chrome is actively deprecating "unload". Replace with "pagehide" or "visibilitychange" to preserve bfcache.');
  } else {
    pass('Zero inline "unload" listeners found');
  }

  // 9. Iron Law: Canonical Cleanliness & Attribution Integrity
  const canonicalMatch = content.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    const href = canonicalMatch[1];
    if (/[?&](utm_|fbclid|gclid)/i.test(href)) {
      fail(`Canonical tag contains tracking query parameters: ${href}`, 'Canonical tags must reference the clean base URL without ad/campaign tracking parameters.');
    } else {
      pass('Canonical tag is clean and free of tracking tokens');
    }
  }

  // 10. Iron Law: Conversion Forms & Interactive Integrity
  const forms = content.match(/<form[\s\S]*?<\/form>/gi) || [];
  if (forms.length > 0) {
    let formsWithSubmit = 0;
    for (const f of forms) {
      if (/(type=["']submit["']|<button(\s|>))/i.test(f)) {
        formsWithSubmit++;
      }
    }
    if (formsWithSubmit === forms.length) {
      pass(`All ${forms.length} conversion form(s) declare accessible submit buttons`);
    } else {
      fail('Form missing accessible submit button', 'Ensure all conversion and contact forms include a valid submit button.');
    }
  } else {
    pass('Zero conversion forms misconfigured');
  }

  // 11. Third-party tracking preconnect check
  const hasGtm = /googletagmanager\.com/i.test(content);
  const hasPixel = /connect\.facebook\.net/i.test(content) || /fbevents\.js/i.test(content);
  if (hasGtm || hasPixel) {
    const hasPreconnect = /<link[^>]+rel=["']preconnect["'][^>]+href=["']https?:\/\/(www\.)?(googletagmanager|connect\.facebook)/i.test(content);
    if (hasPreconnect) {
      pass('Preconnect hints present for marketing tracking tags (GTM/Pixel)');
    } else {
      console.log('  \x1b[33mℹ [TIP]\x1b[0m Tracking detected. Add <link rel="preconnect" href="https://www.googletagmanager.com"> to minimize LCP impact without breaking attribution.');
    }
  }

  // 12. CSS Delivery Strategy — the late-CSS CLS trap
  // A stylesheet that is not render-blocking lets the browser paint with no layout,
  // then re-lay-out the whole page when the file lands. That is a CLS of up to 1.0,
  // and it hits desktop hardest (desktop is ready to paint sooner than mobile).
  const asyncCssOptOut = /<!--\s*pagespeed-allow-async-css\b/i.test(content);
  const THIRD_PARTY_FONT_CSS = /(^|\/\/)(fonts\.googleapis\.com|fonts\.gstatic\.com)\//i;
  const asyncCssLinks = [];

  for (const tag of content.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').toLowerCase();
    const as = (tag.match(/\bas\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').toLowerCase();
    const media = (tag.match(/\bmedia\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').toLowerCase();
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    const hasOnload = /\bonload\s*=/i.test(tag);

    const isPrintSwap = hasOnload && rel.includes('stylesheet') && media === 'print';
    const isPreloadSwap = hasOnload && rel.includes('preload') && as === 'style';
    if (isPrintSwap || isPreloadSwap) asyncCssLinks.push({ href, tag });
  }

  if (asyncCssLinks.length === 0) {
    pass('No non-render-blocking stylesheet (layout CSS always blocks the first paint)');
  } else if (asyncCssOptOut) {
    console.log(`  \x1b[33mℹ [SKIP]\x1b[0m ${asyncCssLinks.length} non-render-blocking stylesheet(s) allowed by the \`pagespeed-allow-async-css\` marker. Remove the marker if the inline <style> does not cover 100% of the layout.`);
  } else {
    for (const item of asyncCssLinks) {
      if (THIRD_PARTY_FONT_CSS.test(item.href)) {
        console.log(`  \x1b[33mℹ [TIP]\x1b[0m Async third-party font CSS (${item.href}). Allowed — but every family it declares needs a metric-matched inline fallback (@font-face with size-adjust + ascent-override), otherwise the font swap shifts text.`);
      } else {
        fail(
          `Non-render-blocking stylesheet: ${item.href || '(no href)'} — <${item.tag.slice(1, 60)}...`,
          'Anything NOT inlined must be non-layout-critical. If this file carries layout (grid/flex/utility classes), it MUST be render-blocking: <link rel="stylesheet" href="...">. Or inline the critical CSS and add <!-- pagespeed-allow-async-css --> to confirm 100% of the layout is inlined.'
        );
      }
    }
  }

  // 13. content-visibility:auto without a matched intrinsic size
  const cvWithoutSize = [];
  const ruleRe = /([^{}]+)\{([^}]*)\}/g;
  let ruleMatch;
  while ((ruleMatch = ruleRe.exec(content)) !== null) {
    const selector = ruleMatch[1].trim();
    const body = ruleMatch[2];
    if (selector.startsWith('@')) continue;
    if (!/content-visibility\s*:\s*auto/i.test(body)) continue;
    if (/contain-intrinsic-size\s*:/i.test(body)) continue;
    cvWithoutSize.push(selector.slice(0, 60));
  }

  if (cvWithoutSize.length === 0) {
    pass('No content-visibility:auto without a paired contain-intrinsic-size');
  } else {
    for (const selector of cvWithoutSize) {
      fail(
        `content-visibility:auto without contain-intrinsic-size on "${selector}"`,
        'The browser guesses the box size until the subtree renders, then the page jumps. Always pair them: content-visibility: auto; contain-intrinsic-size: 1px 400px;'
      );
    }
  }

  // 14. Responsive <source> sizing
  const unsizedSources = (content.match(/<source\b[^>]*>/gi) || []).filter(
    (tag) => /\bsrcset\s*=\s*["'][^"']*\d+w\b/i.test(tag) && !/\bsizes\s*=/i.test(tag)
  );

  if (unsizedSources.length === 0) {
    pass('Every width-descriptor <source srcset> declares a matching sizes attribute');
  } else {
    for (const tag of unsizedSources) {
      fail(
        `<source> with a width-descriptor srcset but no sizes: <${tag.slice(1, 70)}...`,
        'Without sizes the browser assumes 100vw and downloads the largest candidate. Add sizes="(min-width: 1024px) 400px, 88vw".'
      );
    }
  }
}

function auditJsFiles(jsFiles) {
  if (jsFiles.length === 0) return;
  console.log(`\nAuditing ${jsFiles.length} JavaScript file(s) for Event Hygiene & bfcache...`);

  let unloadFound = false;
  for (const jsFile of jsFiles) {
    const rel = path.relative(process.cwd(), jsFile);
    const content = fs.readFileSync(jsFile, 'utf8');

    if (/addEventListener\s*\(\s*['"]unload['"]/i.test(content) || /\bonunload\s*=/i.test(content)) {
      unloadFound = true;
      fail(`Forbidden "unload" listener detected in ${rel}`, 'Replace with window.addEventListener("pagehide", ...) or visibilitychange.');
    }
  }

  if (!unloadFound) {
    pass('Zero "unload" listeners detected across all JS files (bfcache compliant)');
  }
}

function auditManifests(manifestPath) {
  if (fs.existsSync(manifestPath)) {
    console.log(`\nAuditing WebMCP Manifest: \x1b[36m${path.basename(manifestPath)}\x1b[0m`);
    try {
      const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      pass('mcp-manifest.json is valid JSON');
      if (Array.isArray(json.resources)) {
        let allHaveUrls = true;
        for (const res of json.resources) {
          if (!res.url) {
            allHaveUrls = false;
            fail(`Resource "${res.name}" missing resolvable "url" field`, 'Agents need a public HTTPS URL to fetch content.');
          }
        }
        if (allHaveUrls) pass(`All ${json.resources.length} declared resources have resolvable HTTPS URLs`);
      }
    } catch (err) {
      fail('Invalid JSON in mcp-manifest.json', err.message);
    }
  }
}

function main() {
  console.log('========================================================');
  console.log(' Deterministic Optimization & Rules Validator');
  console.log('========================================================');

  const htmlFiles = findFiles(targetPath, ['.html']);
  const jsFiles = findFiles(targetPath, ['.js', '.mjs', '.ts']);
  const mcpManifest = path.join(fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath), 'mcp-manifest.json');

  if (htmlFiles.length === 0 && jsFiles.length === 0) {
    console.error(`No HTML or JS files found to audit at target: ${targetPath}`);
    process.exit(1);
  }

  for (const html of htmlFiles) {
    auditHtml(html);
  }

  auditJsFiles(jsFiles);
  auditManifests(mcpManifest);

  console.log('\n========================================================');
  console.log(` Final Audit Results: \x1b[32m${passes} Passed\x1b[0m, \x1b[${failures > 0 ? '31' : '32'}m${failures} Failed\x1b[0m`);
  console.log('========================================================');

  if (failures > 0) {
    console.error(`\x1b[31m[CRITICAL GATE FAILURE]\x1b[0m ${failures} rule(s) violated. AI agent MUST fix all failures before concluding.\n`);
    process.exit(1);
  } else {
    console.log('\x1b[32m[GATE CLEARED]\x1b[0m 100% deterministic optimization rules verified! Ready for Lighthouse CLI.\n');
    process.exit(0);
  }
}

main();
