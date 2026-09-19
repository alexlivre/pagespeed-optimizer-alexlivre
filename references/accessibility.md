# Accessibility (a11y) Master Reference Guide

Target: **100/100 Accessibility Score** (WCAG 2.2 AA — W3C Recommendation, October 2023).

WCAG 2.2 added **9 new success criteria** since 2.1. The most impactful for typical web projects are listed below. Levels: **A** (lowest), **AA** (target), **AAA** (highest, often impractical to satisfy site-wide).

---

## 1. Landmark Structure & Document Hierarchy

All pages MUST use semantic HTML5 elements to structure screen reader navigation:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessible Title</title>
</head>
<body>
  <!-- Header Landmark -->
  <header>
    <nav aria-label="Main Navigation">
      <ul>
        <li><a href="/" aria-current="page">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <!-- Main Landmark (ONLY ONE <main> PER PAGE) -->
  <main id="main-content">
    <article>
      <h1>Primary Page Heading</h1>
      <section aria-labelledby="section-1-title">
        <h2 id="section-1-title">Section Heading</h2>
        <p>Content goes here...</p>
      </section>
    </article>
  </main>

  <!-- Footer Landmark -->
  <footer role="contentinfo">
    <p>&copy; 2026 Company Name. All rights reserved.</p>
  </footer>
</body>
</html>
```

---

## 2. Text Equivalence & ARIA Labels

- **Informative Images**: Descriptive `alt="..."` text describing image context.
- **Decorative Images**: `alt=""` AND `aria-hidden="true"`.
- **Icon Buttons**: Must include `aria-label` or visually hidden text for screen readers:
  ```html
  <button aria-label="Close dialog">
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </button>
  ```
- **Dynamic Content & Toast Notifications**: Use `aria-live` regions:
  ```html
  <div aria-live="polite" aria-atomic="true" class="toast-container">
    <!-- Dynamic notification text injected here -->
  </div>
  ```

---

## 3. Form Accessibility & Touch Targets

- **Form Labels**: Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label for="id">` or `aria-label`.
- **Touch Targets (WCAG 2.2 SC 2.5.8 — AA)**: Interactive elements must be at least **24×24 CSS pixels**. For coarse pointers (touch devices), the AAA-recommended target is **44×44px**. See section 8 for the full breakdown:
  ```css
  button, a.btn {
    min-width: 24px;
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
  }

  @media (pointer: coarse) {
    button, a.btn {
      min-width: 44px;
      min-height: 44px;
    }
  }
  ```

---

## 4. Color Contrast Ratios (WCAG 2.2 AA)

- **Normal Text (< 24px / 18pt)**: Minimum **4.5:1** contrast ratio.
- **Large Text (≥ 24px / 18pt or 19px bold)**: Minimum **3.0:1** contrast ratio.
- **UI Components & Borders**: Minimum **3.0:1** contrast ratio against surrounding background.

```css
/* BAD: Light grey on white (#999999 / #ffffff = 2.8:1) */
.text-muted { color: #999999; }

/* GOOD: Dark slate grey on white (#475569 / #ffffff = 7.0:1) */
.text-muted { color: #475569; }
```

---

## 5. Keyboard Focus Indicators

Never remove focus outlines without providing a high-contrast replacement:

```css
:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

To satisfy **WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA)**, ensure no sticky header, cookie banner, or chat widget ever completely covers the focused element. Use `scroll-padding` and `scroll-margin` so the browser scrolls the focused element into an unobscured area:

```css
html {
  scroll-padding-top: 80px; /* height of sticky header */
}

button:focus-visible,
a:focus-visible {
  scroll-margin: 80px;
}
```

For **SC 2.4.13 Focus Appearance (AAA)**, the focus indicator must satisfy a perimeter-to-length ratio and contrast against the adjacent background. Use a thick, high-contrast outline (3px minimum) and test with the [A11y Focus Order Inspector](https://chromewebstore.google.com/detail/accessibility-insights/).

---

## 6. Native Color Scheme & Dark Mode

Declare `color-scheme` on `:root` to opt into the browser's native form controls, scrollbars, and default colors for both light and dark modes. This eliminates the white-flash on dark-mode reload and prevents native widgets from rendering incorrectly.

```css
:root {
  color-scheme: light dark;
}

:root[data-theme='light'] {
  color-scheme: light;
  --bg: #ffffff;
  --fg: #0f172a;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --bg: #0f172a;
  --fg: #f1f5f9;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
    --bg: #0f172a;
    --fg: #f1f5f9;
  }
}
```

Pair with a `<meta name="theme-color">` tag so the browser chrome (address bar on mobile) matches:

```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">
```

---

## 7. Reduced Motion (WCAG 2.1 SC 2.3.3 + UX Best Practice)

Users with vestibular disorders rely on the system-level "reduce motion" setting. Respect it across CSS and JS animations:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In JavaScript, gate non-essential animation:

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animate(element) {
  if (reducedMotion) {
    element.style.opacity = '1';
    return;
  }
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
}
```

---

## 8. Touch Target Size (WCAG 2.2 SC 2.5.8 — AA)

WCAG 2.2 introduced **SC 2.5.8 Target Size (Minimum) — AA**: interactive targets must be at least **24×24 CSS pixels**, unless they are inline in a sentence, the user can equivalently control them through a different element on the same page, or they are user-agent controlled. The previous **WCAG 2.1 SC 2.5.5 (AAA)** still recommends **44×44px** as a best practice for touch UX.

```css
button,
a.btn,
input[type='checkbox'],
input[type='radio'] {
  min-width: 24px;
  min-height: 24px;
}

@media (pointer: coarse) {
  /* Coarse pointers (touch) — prefer the AAA target */
  button, a.btn {
    min-width: 44px;
    min-height: 44px;
  }
}
```

**SC 2.5.7 Dragging Movements (AA)**: if an action requires dragging (slider, drag-to-reorder), provide a single-pointer alternative (click or tap to position).

---

## 9. Accessible Authentication (WCAG 2.2 SC 3.3.7–3.3.9)

- **SC 3.3.7 Redundant Entry (A)**: do not require users to re-enter the same information in multiple steps of a flow.
- **SC 3.3.8 Accessible Authentication (Minimum) — AA**: do not rely on cognitive function tests (e.g., "type the characters in this image"). Use passkeys, magic links, or social login.
- **SC 3.3.9 Accessible Authentication (Enhanced) — AAA**: no cognitive function test *and* no recognition-based test (e.g., recognizing faces). Passkeys are the canonical solution.

---

## 10. Quick Reference: WCAG 2.2 New Success Criteria

| SC | Name | Level | Practical fix |
| :--- | :--- | :--- | :--- |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | `scroll-padding` + ensure sticky elements do not cover the focused element |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA | No overlap at all |
| 2.4.13 | Focus Appearance | AAA | 3px+ outline, 3:1 contrast vs adjacent background |
| 2.5.7 | Dragging Movements | AA | Provide tap/click alternative |
| 2.5.8 | Target Size (Minimum) | AA | 24×24 CSS px minimum |
| 3.3.7 | Redundant Entry | A | Reuse previously-entered values within the same flow |
| 3.3.8 | Accessible Authentication (Min) | AA | No CAPTCHA, no cognitive puzzles |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA | No recognition tests either |

### Implementation: SC 2.4.11 Focus Not Obscured & SC 2.4.13 Focus Appearance
Sticky/fixed headers often obscure keyboard-focused elements when jumping via `#anchors`. Declare `scroll-padding-top` matching the fixed header height:
```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: var(--header-height, 80px);
}

:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  border-radius: 4px;
}
```

For the canonical source, see [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/).
