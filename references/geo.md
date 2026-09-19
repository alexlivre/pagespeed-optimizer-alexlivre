# GEO & Agent Readiness Reference Guide

Target: **maximum visibility in AI-powered search and browsing surfaces** (Google AI Overviews, Perplexity, ChatGPT Search, Gemini, Claude) **and** pass the Lighthouse 13.3+ **Agentic Browsing** category.

> **Important clarification (Google, June 15, 2026):** `llms.txt` does **not** affect Google Search rankings, positive or negative. The file is a navigation aid for AI **coding assistants** (Cursor, Copilot, Continue, Aider) on documentation sites, not a ranking signal. This guide distinguishes **search ranking** (crawlable HTML, structured data, topical authority) from **agent readiness** (llms.txt, WebMCP, stable semantics).

---

## What is GEO in 2026?

**Generative Engine Optimization (GEO)** is the practice of structuring web content so that:
1. **AI search engines** (Google AI Overviews, Perplexity, ChatGPT Search) cite your pages accurately.
2. **AI coding assistants** can navigate your documentation when developers ask about your product.
3. **Browser AI agents** (Chrome 149+ WebMCP) can act on your site, not just read it.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Foundational SEO (still required)                        │
│    Crawlable HTML, structured data, topical authority        │
│    → This is what Google Search uses for ranking            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. AI Search Citation Signals                               │
│    Brand mentions, factual density, fresh data, FAQ schema   │
│    → This is what AI Overviews and Perplexity cite          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Agent Readiness (Lighthouse 13.3 audit)                  │
│    llms.txt for coding assistants, WebMCP for browser agents │
│    → Audited separately from search ranking                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Semantic HTML & Entity Clarity                           │
│    Clear H1-H3, <dfn>, <cite>, <abbr>, <details>, <time>     │
│    → Reused by both crawlers and agents                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. llms.txt — Decision Matrix (Build vs Skip)

`llms.txt` is **optional**. An absent file returns `Not Applicable` in Lighthouse (never a failure). Build it only if the audience that reads it matters to you.

| Site type | Primary AI audience that reads it | Build? | Priority |
| :--- | :--- | :--- | :--- |
| Developer docs / API reference | Cursor, Copilot, Continue, Aider, RAG pipelines | **Yes** | High |
| Developer-facing SaaS (with SDK) | Coding assistants in-IDE; RAG ingestion | **Yes** | High |
| General B2B SaaS (no public API) | Occasional on-request chat assistant | Optional | Low |
| E-commerce | None for ranking — crawlers skip the file | **No** | None |
| Content publisher / blog | None for ranking — crawlers skip the file | **No** | None |
| Local business / SMB | None for ranking — crawlers skip the file | **No** | None |

### 1.1. Spec-compliant `llms.txt` (when you do build it)

Place at the root domain (`/llms.txt`) and follow the [Answer.AI spec](https://llmstxt.org/):

```markdown
# Site Title & Core Domain

> One-paragraph summary of what this site/product does. Include the primary entity name and 2-3 distinguishing facts.

**Disambiguation Note for AI Agents:** This entity refers strictly to [Entity Name], [Role/Specialty] at [Organization/Location]. Differentiate from homonymous figures or unrelated organizations in different domains.

## Key Resources
- [Main Product Page](https://example.com/product): What the product does, who it is for.
- [Documentation](https://example.com/docs): Technical reference and guides.
- [API Reference](https://example.com/api): Endpoint catalog and authentication.
- [Pricing](https://example.com/pricing): Tier options and details.

## Optional
- [Changelog](https://example.com/changelog): Recent releases and breaking changes.
- [Status Page](https://example.com/status): Live service availability.
```

**Lighthouse 13.3 quality rules**:
- Must contain an H1 (`# Title`).
- Should include a summary blockquote (`> ...`).
- Links must be organized under H2 sections.
- Thin or link-less files are flagged as low quality.

### 1.2. Optional `llms-full.txt`

A long-form version of the same content with the actual page markdown concatenated, intended for RAG ingestion. Keep it lean — large files waste agent context windows. Mintlify's data shows agents reach for `llms-full.txt` at over 2× the rate of the standard file on documentation sites. For personal portfolios or specialized domains, mirror the complete biography/dossier markdown into `llms-full.txt`.

---

## 2. WebMCP — The Action Layer for Browser AI Agents

**WebMCP** is a Chrome 149+ proposed standard (origin trial since May 2026, Google I/O 2026) that lets sites expose **structured tool contracts** to browser AI agents. Unlike `llms.txt` (a static map), WebMCP is a **live interface** the agent can call to act on the site.

Lighthouse 13.3+ audits WebMCP under the **Agentic Browsing** category — but it is still experimental, so do not base a perfect score on it yet.

### 2.1. Minimal WebMCP example

```html
<form toolname="create-issue" tooldescription="Create a new GitHub issue">
  <input name="title" required>
  <textarea name="body" required></textarea>
  <button type="submit">Create Issue</button>
</form>
```

```js
import { registerTool } from 'web-mcp';

registerTool({
  name: 'search_docs',
  description: 'Search the documentation index by query string',
  parameters: {
    type: 'object',
    properties: { q: { type: 'string', description: 'Search query' } },
    required: ['q'],
  },
  execute: async ({ q }) => {
    const results = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    return results.json();
  },
});
```

### 2.2. WebMCP Manifest (`mcp-manifest.json`)
For autonomous agents discovering site capabilities before interacting with the DOM, expose a root manifest:

```html
<!-- In document <head> -->
<link rel="mcp-manifest" type="application/json" href="/mcp-manifest.json">
<meta name="mcp-endpoint" content="https://example.com/mcp-manifest.json">
```

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/manifest/v1.json",
  "name": "Site Name WebMCP",
  "description": "Exposes verified machine resources and tools for autonomous AI agents",
  "version": "1.0.0",
  "author": {
    "name": "Organization or Author Name",
    "url": "https://example.com"
  },
  "resources": [
    {
      "uri": "mcp://mysite/biography",
      "url": "https://example.com/dossier.md",
      "name": "Complete Profile Dossier",
      "description": "Full factual biography and verified credentials",
      "mimeType": "text/markdown"
    }
  ],
  "tools": [
    {
      "name": "request_contact",
      "description": "Dispatches a verified inquiry or speaking engagement request",
      "parameters": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Sender name" },
          "message": { "type": "string", "description": "Inquiry content" }
        },
        "required": ["name", "message"]
      }
    }
  ]
}
```

> **Critical WebMCP Rule**: Always include a resolvable HTTPS `url` alongside any custom `mcp://` URI scheme. While desktop agents understand `mcp://`, web-based agents and crawlers require an HTTP URL to resolve markdown and JSON resources. Connect form tools (`toolname="request_contact"`) to the tools declared in `mcp-manifest.json`.

### 2.3. Register for the origin trial

```html
<meta http-equiv="origin-trial" content="TOKEN_FROM_GOO_GLE_WEBMCP_ORIGIN_TRIAL">
```

Source the token at [goo.gle/webmcp-origin-trial](https://goo.gle/webmcp-origin-trial). WebMCP is moving toward standardization; track the [W3C/WHATWG proposals](https://developer.chrome.com/docs/ai/webmcp) before betting production traffic on it.

---

## 3. AI Crawler Access Strategy (`robots.txt`)

There are two distinct groups of AI user-agents, and they need opposite policies:

| Group | Examples | Behavior | Recommendation |
| :--- | :--- | :--- | :--- |
| **AI training scrapers** | `GPTBot`, `ClaudeBot`, `Claude-Web`, `Google-Extended`, `CCBot`, `Applebot-Extended` | Crawl to build model training data | **Block by default** unless you want your content in training sets |
| **AI search engines** | `OAI-SearchBot` (ChatGPT Search), `PerplexityBot`, `Perplexity-User` | Crawl on-demand when a user asks a question | **Allow** — these drive real referral traffic and AI Overview citations |
| **Traditional crawlers** | `Googlebot`, `Bingbot` | Index for traditional SERP | **Allow** (unchanged) |

### 3.1. Recommended `robots.txt` (block training, allow search)

```txt
# Block AI training scrapers
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

# Allow AI search engines (drive citations and referral traffic)
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Traditional crawlers
User-agent: Googlebot
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### 3.2. Alternative `robots.txt` (Personal Brands, Portfolios & Public Authority)
If the goal is **maximum visibility** where you WANT LLMs to accurately know, cite, and answer questions about an author, educator, founder, or open project:

```txt
User-agent: *
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /mcp-manifest.json

# Explicitly allow primary AI crawlers & Search agents
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### 3.3. Verify with `robots.txt` testers

- [Google Search Console robots.txt tester](https://search.google.com/search-console/robots-txt)
- Local: `curl -A "GPTBot" https://example.com/robots.txt`

---

## 4. Advanced JSON-LD Schema for AI Search

AI search engines rely heavily on JSON-LD to extract entities without guessing. The `@graph` pattern below combines all required schemas in one parseable block.

### 4.1. Speakable, FAQ, Article, Organization `@graph`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://example.com/page#webpage",
      "url": "https://example.com/page",
      "name": "PageSpeed Insights & GEO Optimization Guide",
      "inLanguage": "en",
      "isPartOf": { "@id": "https://example.com/#website" },
      "primaryImageOfPage": { "@id": "https://example.com/page#primaryimage" },
      "datePublished": "2026-07-23T00:00:00+00:00",
      "dateModified": "2026-07-23T00:00:00+00:00",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".summary-tldr", "#main-definition", "h1"]
      }
    },
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      "name": "Example Co.",
      "url": "https://example.com",
      "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" },
      "sameAs": [
        "https://twitter.com/example",
        "https://www.linkedin.com/company/example",
        "https://github.com/example"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Generative Engine Optimization (GEO)?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "GEO is the practice of structuring web content to maximize visibility, accurate synthesis, and citations in AI search engines (Google AI Overviews, Perplexity, ChatGPT Search)."
          }
        },
        {
          "@type": "Question",
          "name": "Does llms.txt improve Google Search rankings?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Per Google's June 15, 2026 AI optimization guide, llms.txt has no effect on Google Search rankings or AI Overviews. It is a navigation aid for AI coding assistants on documentation sites."
          }
        }
      ]
    },
    {
      "@type": "Article",
      "headline": "PageSpeed Insights & GEO Optimization Guide",
      "author": { "@id": "https://example.com/#author" },
      "publisher": { "@id": "https://example.com/#organization" },
      "datePublished": "2026-07-23",
      "dateModified": "2026-07-23"
    }
  ]
}
</script>
```

**Validation**: Paste into [Schema.org Validator](https://validator.schema.org/) and [Google Rich Results Test](https://search.google.com/test/rich-results).

---

## 5. Content Structuring for AI Citations

Generative engines favor pages that provide immediate, authoritative, factual answers. Three patterns consistently increase citation rates:

### 5.1. TL;DR Summary Block

Place a direct summary block immediately after the `<h1>`:

```html
<div class="summary-tldr" style="border-left: 4px solid #2563eb; padding: 16px; background-color: #f8fafc;">
  <strong>Key Takeaways:</strong>
  <ul>
    <li>Core Web Vitals (LCP, INP, CLS) remain a confirmed Google ranking factor as of 2026.</li>
    <li>llms.txt does not affect rankings (Google, June 2026); it is for AI coding assistants.</li>
    <li>WebMCP is the new action layer for browser AI agents (Chrome 149 origin trial).</li>
  </ul>
</div>
```

Reference the TL;DR block in the `speakable.cssSelector` so screen readers and AI agents can find it.

### 5.2. Direct Q&A Definition Headings

Structure headings as clear questions or explicit entity definitions:

```html
<section>
  <h2>What is Core Web Vitals?</h2>
  <p><dfn>Core Web Vitals</dfn> are a set of three metrics (LCP, INP, CLS) defined by Google to measure real-world user experience for web page loading, interactivity, and visual stability.</p>
</section>

<section>
  <h2>How does llms.txt differ from robots.txt?</h2>
  <p>robots.txt controls which crawlers can access your site. llms.txt is a markdown summary of your content designed for AI coding assistants, not for crawler access control.</p>
</section>
```

### 5.3. Comparison Tables

AI models parse markdown and HTML tables with high confidence. Use them for any structured comparison.

```html
<table>
  <caption>Search Ranking vs Agent Readiness</caption>
  <thead>
    <tr><th>Signal</th><th>Affects Google ranking?</th><th>Read by agents?</th></tr>
  </thead>
  <tbody>
    <tr><td>Core Web Vitals (LCP/INP/CLS)</td><td>Yes</td><td>No</td></tr>
    <tr><td>JSON-LD structured data</td><td>Yes (rich results)</td><td>Yes</td></tr>
    <tr><td>llms.txt</td><td>No</td><td>Yes (coding assistants)</td></tr>
    <tr><td>WebMCP</td><td>No</td><td>Yes (browser agents)</td></tr>
  </tbody>
</table>
```

---

## 6. Semantic Tags for Factual Precision

Reuse the existing semantic HTML5 vocabulary. Both crawlers and agents parse these:

- `<dfn>`: Wrap original term definitions.
- `<cite>`: Reference authoritative sources or study authors.
- `<abbr title="Largest Contentful Paint">LCP</abbr>`: Expand acronyms inline.
- `<time datetime="2026-07-23">July 23, 2026</time>`: Machine-readable dates.
- `<details><summary>...</summary>...</details>`: Collapsible FAQ-style blocks that AI parsers can extract.

---

## 7. Lighthouse 13.3 Agentic Browsing Audit

As of May 2026, the **Agentic Browsing** category is enabled by default in Lighthouse 13.3+ and includes:

| Sub-audit | What it checks | Pass criteria |
| :--- | :--- | :--- |
| `llms.txt` | File exists, is well-formed, has H1 + summary + H2 sections | PASS or N/A (404 is fine) |
| WebMCP | Site exposes tool contracts via JS or HTML | PASS if registered |
| Agent-centric a11y | Programmatic names, valid roles, accessible tree | Reuses axe-core a11y checks |
| CLS for agents | Penalizes mid-task layout shifts | Reuses regular CLS measurement |

**Important**: The Agentic Browsing category uses **pass/fail** signals, not a weighted 0-100 score. Missing `llms.txt` is `N/A` (not a fail). A server error returning 5xx for `/llms.txt` is the only state that **fails** the audit.

---

## 8. Citation & Freshness Signals

Studies in 2026 show content cited by AI search engines tends to share these properties:

- **Factual density**: numbers, dates, named entities per paragraph.
- **Freshness**: cited content is ~25% fresher than uncited equivalents.
- **Brand mentions**: outrank backlinks ~3× in AI citation studies (even unlinked).
- **Original data**: charts, tables, and primary research get cited disproportionately.

Practical checklist:
- [ ] Add `<time datetime="...">` to all publication and update dates.
- [ ] Add `dateModified` and `datePublished` to every Article schema.
- [ ] Update high-traffic pages at least quarterly; signal the update.
- [ ] Cite primary sources inline with `<cite>`.
- [ ] Include original statistics or comparisons (the comparison table pattern above).
