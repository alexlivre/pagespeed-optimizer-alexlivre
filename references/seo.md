# SEO (Search Engine Optimization) Master Reference Guide

Target: **100/100 SEO Score** on PageSpeed Insights & Google Lighthouse 13+.

---

## 1. Technical Meta Stack

Place these meta tags directly inside `<head>`:

```html
<!-- Title: 50-60 characters, brand & primary keywords -->
<title>PageSpeed Optimizer - Boost Lighthouse Scores to 100</title>

<!-- Meta Description: 150-160 characters, compelling call-to-action -->
<meta name="description" content="Automated optimization skill for web developers to achieve 100/100 PageSpeed Insights scores across Performance, Accessibility, Best Practices, SEO, and GEO.">

<!-- Mobile Viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Canonical Tag -->
<link rel="canonical" href="https://example.com/pagespeed-optimizer">

<!-- Crawling Directives -->
<meta name="robots" content="index, follow">

<!-- Theme Color (matches browser chrome to your brand) -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">

<!-- Format Detection (avoid iOS auto-linking phone numbers) -->
<meta name="format-detection" content="telephone=no">

<!-- Geographic SEO & Local Grounding (Crucial for AI Overviews & Local Pack) -->
<meta name="geo.region" content="BR-BA">
<meta name="geo.placename" content="City or Region Name">
<meta name="geo.position" content="-12.0969;-45.7958">
<meta name="ICBM" content="-12.0969, -45.7958">
```

---

## 2. OpenGraph & Twitter Social Cards

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/pagespeed-optimizer">
<meta property="og:title" content="PageSpeed Optimizer - Boost Lighthouse Scores to 100">
<meta property="og:description" content="Automated optimization skill to achieve 100/100 PageSpeed Insights scores.">
<meta property="og:image" content="https://example.com/og-image.jpg">

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="PageSpeed Optimizer - Boost Lighthouse Scores to 100">
<meta name="twitter:description" content="Automated optimization skill to achieve 100/100 PageSpeed Insights scores.">
<meta name="twitter:image" content="https://example.com/og-image.jpg">
```

---

## 3. Heading Structure Hierarchy & Entity-Centric H1

Lighthouse requires readable content hierarchy:

- Exactly **ONE** `<h1>` tag representing the page topic.
- Subsections organized logically under `<h2>`, `<h3>`, `<h4>` without skipping levels (e.g., do not jump from `<h1>` to `<h3>`).
- **Entity-Centric H1 Rule (Critical for Personal Brands & Portfolios)**:
  Avoid generic slogans as the sole `<h1>` (e.g., `<h1>Empowering Innovation through AI</h1>`). For personal websites, portfolios, or consultancy brands, the primary target entity **must be part of the `<h1>`** to bind Google's Knowledge Graph directly to the subject:
  ```html
  <!-- BAD: Generic marketing slogan, zero lexical entity signal -->
  <h1>Education with Artificial Intelligence and Human Rigor</h1>

  <!-- GOOD: Entity + Core Discipline + Value Proposition -->
  <h1>Professor Rafael Alves da Silva: Inovação Educacional com Inteligência Artificial</h1>
  ```

```html
<h1>Main Product or Entity Name — Primary Topic</h1>
<section>
  <h2>Features Overview</h2>
  <h3>Performance Optimization</h3>
  <h3>Accessibility Compliance</h3>
</section>
```

---

## 4. BreadcrumbList Schema (Rich SERP Navigation)

Add `BreadcrumbList` to the JSON-LD `@graph` so Google displays structured breadcrumbs in search results instead of a raw URL:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Portfolio & Projects",
      "item": "https://example.com/#projects"
    }
  ]
}
```

---

## 5. Schema.org Traps & Entity Credential Validation

Avoid common Schema.org validation errors that cause rich results rejection:

- **Degree vs University Trap**: In Schema.org, an educational institution (`CollegeOrUniversity`) is an `Organization` and does **not** accept the `degree` predicate directly. Instead, nest credentials under `EducationalOccupationalCredential`:
  ```json
  "alumniOf": {
    "@type": "CollegeOrUniversity",
    "name": "University Name"
  },
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "degree",
    "name": "Bachelor of Science / Licenciatura",
    "recognizedBy": {
      "@type": "CollegeOrUniversity",
      "name": "University Name"
    }
  }
  ```
- **Entity Authority Links (`sameAs`)**: Connect verified authoritative third-party profiles (LinkedIn, Wikipedia, official event speaker profiles, GitHub, press articles) to establish entity authority in Google's Knowledge Graph.
- **Strict Matching between Schema and Visible DOM**: Every claim, credential, or FAQ in JSON-LD **must** be visible on the page. Invisible schema data triggers Google spam penalties.

---

## 6. Crawlable Anchor Text & Legible Fonts

- **Descriptive Anchor Text**: Never use vague link labels like `"click here"`, `"more"`, or `"link"`. Use descriptive phrases like `"Read the Core Web Vitals guide"`.
- **Font Legibility**: Ensure body font size is at least **12px** (recommended 16px) and tap targets do not overlap. Lighthouse 13 removed the `font-size` audit, but small body text still hurts UX and conversion — keep body text at 16px or larger.

---

## 7. Multi-language Pages (`hreflang`)

For pages available in multiple languages or regional variants, use `hreflang` to signal the canonical mapping:

```html
<link rel="alternate" hreflang="en" href="https://example.com/page">
<link rel="alternate" hreflang="pt-BR" href="https://example.com/pt-br/page">
<link rel="alternate" hreflang="es" href="https://example.com/es/page">
<link rel="alternate" hreflang="x-default" href="https://example.com/page">
```

**Rules**:
- Every page in a cluster must reference **all** other pages in the cluster (including itself).
- `x-default` is required and points to the default (non-targeted) version.
- Use **absolute URLs**, never relative.
- For content syndication, also include `rel="canonical"` pointing to the original.

---

## 8. RSS / Atom Feeds

For content-heavy sites, an RSS feed is still the highest-signal freshness indicator to traditional crawlers. Lighthouse does not score it, but it improves indexing speed and is the canonical machine-readable source for content.

```html
<link rel="alternate" type="application/rss+xml" title="Example Blog" href="https://example.com/feed.xml">
<link rel="alternate" type="application/atom+xml" title="Example Blog" href="https://example.com/feed.atom">
```
