#!/usr/bin/env node
/**
 * Opens routes at phone, tablet and desktop widths in a real browser and
 * reports what breaks: sideways scrolling, controls too small to tap, inputs
 * that make iOS zoom, tiny text, broken images, a missing viewport tag,
 * blocked pinch zoom, console errors. Saves a full-page screenshot per route
 * and width so you can look at them.
 *
 * Setup (once, in the web project):
 *   npm i -D playwright && npx playwright install chromium
 *
 * Run from the web project folder, with the dev server already up:
 *   node viewport_audit.mjs --base-url http://localhost:3000 --routes /,/pricing,/contact
 *
 * Pages behind a login, either way:
 *   1. Reuse a saved Playwright session:  --storage-state auth.json
 *   2. Sign in first (credentials from the environment, never the command line):
 *        AUDIT_USER=... AUDIT_PASSWORD=... node viewport_audit.mjs --login-url /login \
 *          --user-selector '#email' --password-selector '#password' \
 *          --submit-selector 'button[type=submit]'
 *
 * Options:
 *   --base-url           default http://localhost:3000
 *   --routes             comma list, default "/"
 *   --viewports          comma list of WxH, default 320x640,360x800,390x844,768x1024,1280x800
 *   --touch-width        widths up to this get touch checks, default 768
 *   --out                default ./ui-audit
 *   --storage-state      Playwright storage state file for a signed-in session
 *   --login-url, --user-selector, --password-selector, --submit-selector
 *                        sign in before auditing; needs AUDIT_USER and AUDIT_PASSWORD
 *
 * Exit code: 0 clean, 1 when any high-severity issue is found, 2 on a setup error.
 */
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// Resolve Playwright from the folder the command is run in (the web project),
// not from wherever this script lives.
let chromium;
try {
  ({ chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright"));
} catch {
  console.error(
    "Playwright is not installed here. From the web project folder run:\n" +
      "  npm i -D playwright && npx playwright install chromium",
  );
  process.exit(2);
}

const DEFAULT_VIEWPORTS = "320x640,360x800,390x844,768x1024,1280x800";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[token.slice(2)] = true;
    } else {
      args[token.slice(2)] = next;
      i++;
    }
  }
  return args;
}

/**
 * Runs inside the page, so it must not reference anything outside itself.
 */
function auditInPage(isTouch) {
  const issues = [];
  const viewportWidth = document.documentElement.clientWidth;

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const classes =
      typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${classes}${text ? ` "${text}"` : ""}`;
  };

  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0"
    );
  };

  const insideScroller = (el) => {
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const overflowX = getComputedStyle(parent).overflowX;
      if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  };

  // Viewport tag.
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    issues.push({
      rule: "no-viewport-meta",
      severity: "high",
      detail: "no viewport meta tag; phones lay the page out at desktop width and shrink it",
      elements: [],
    });
  } else if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewportMeta.content)) {
    issues.push({
      rule: "zoom-blocked",
      severity: "high",
      detail: `viewport tag blocks pinch zoom: "${viewportMeta.content}"`,
      elements: [],
    });
  }

  // Sideways scrolling.
  const pageWidth = document.documentElement.scrollWidth;
  if (pageWidth > viewportWidth + 1) {
    const offenders = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (offenders.length >= 8) break;
      if (!isVisible(el) || insideScroller(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        offenders.push(`${describe(el)} (right edge ${Math.round(rect.right)}px)`);
      }
    }
    issues.push({
      rule: "horizontal-overflow",
      severity: "high",
      detail: `page is ${pageWidth}px wide in a ${viewportWidth}px viewport`,
      elements: offenders,
    });
  }

  // Touch targets and iOS input zoom.
  if (isTouch) {
    const controls = document.querySelectorAll(
      "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], summary",
    );
    const small = [];
    const zoomers = [];
    for (const el of controls) {
      if (!isVisible(el)) continue;
      // Segmented-code widgets lay one transparent input over their slots;
      // the slots are what a thumb hits, so the overlay is not a target.
      if (el.hasAttribute("data-input-otp")) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isField = ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);

      if (isField && parseFloat(style.fontSize) < 16) {
        zoomers.push(`${describe(el)} (${style.fontSize})`);
      }
      // Links inside running text are exempt from target-size rules.
      if (el.tagName === "A" && style.display === "inline") continue;

      const shortest = Math.min(rect.width, rect.height);
      if (shortest < 44) {
        small.push(`${describe(el)} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
      }
    }
    if (small.length) {
      issues.push({
        rule: "small-tap-target",
        severity: "medium",
        detail: `${small.length} control(s) under 44px`,
        elements: small.slice(0, 8),
      });
    }
    if (zoomers.length) {
      issues.push({
        rule: "input-font-under-16px",
        severity: "medium",
        detail: "iOS Safari zooms the page when such a field is focused",
        elements: zoomers.slice(0, 8),
      });
    }
  }

  // Tiny text.
  const tiny = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode() && tiny.length < 8) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const parent = node.parentElement;
    if (!parent || !isVisible(parent)) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    const size = parseFloat(getComputedStyle(parent).fontSize);
    if (size < 12) tiny.push(`${describe(parent)} (${size}px)`);
  }
  if (tiny.length) {
    issues.push({ rule: "tiny-text", severity: "medium", detail: "text under 12px", elements: tiny });
  }

  // Images.
  const brokenImages = [];
  const imagesWithoutAlt = [];
  for (const img of document.querySelectorAll("img")) {
    if (!isVisible(img)) continue;
    if (img.complete && img.naturalWidth === 0) brokenImages.push(describe(img));
    if (!img.hasAttribute("alt")) imagesWithoutAlt.push(describe(img));
  }
  if (brokenImages.length) {
    issues.push({ rule: "broken-image", severity: "high", detail: "image failed to load", elements: brokenImages.slice(0, 8) });
  }
  if (imagesWithoutAlt.length) {
    issues.push({ rule: "image-no-alt", severity: "medium", detail: "image without alt attribute", elements: imagesWithoutAlt.slice(0, 8) });
  }

  return issues;
}

async function signIn(context, baseUrl, args) {
  const user = process.env.AUDIT_USER;
  const password = process.env.AUDIT_PASSWORD;
  const required = ["login-url", "user-selector", "password-selector", "submit-selector"];
  const missing = required.filter((name) => typeof args[name] !== "string");
  if (!user || !password || missing.length) {
    throw new Error(
      "Signing in needs AUDIT_USER and AUDIT_PASSWORD in the environment and " +
        required.map((name) => `--${name}`).join(", ") +
        (missing.length ? `. Missing: ${missing.map((name) => `--${name}`).join(", ")}` : ""),
    );
  }
  const page = await context.newPage();
  await page.goto(new URL(args["login-url"], baseUrl).toString(), { waitUntil: "load" });
  await page.fill(args["user-selector"], user);
  await page.fill(args["password-selector"], password);
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => undefined),
    page.click(args["submit-selector"]),
  ]);
  await page.waitForTimeout(800);
  await page.close();
}

async function visit(context, baseUrl, route, viewport, touchWidth, outDir) {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200));
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error).slice(0, 200)));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`.slice(0, 200));
  });

  const url = new URL(route, `${baseUrl}/`).toString();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
  }
  await page.waitForTimeout(400);

  const finalPath = new URL(page.url()).pathname;
  const issues = await page.evaluate(auditInPage, viewport.width <= touchWidth);
  const slug = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
  const screenshot = `${slug}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: path.join(outDir, screenshot), fullPage: true });
  await page.close();

  return { route, finalPath, viewport: `${viewport.width}x${viewport.height}`, issues, consoleErrors, failedRequests, screenshot };
}

function toMarkdown(results) {
  const lines = ["# Viewport audit", ""];
  for (const result of results) {
    const redirected = result.finalPath !== new URL(result.route, "http://x").pathname
      ? ` (landed on ${result.finalPath})`
      : "";
    lines.push(`## ${result.route} at ${result.viewport}${redirected}`, "");
    if (!result.issues.length && !result.consoleErrors.length) {
      lines.push("No issues found.", "");
    }
    for (const issue of result.issues) {
      lines.push(`- **${issue.severity}** ${issue.rule}: ${issue.detail}`);
      for (const element of issue.elements ?? []) lines.push(`  - ${element}`);
    }
    for (const error of result.consoleErrors) lines.push(`- **console error** ${error}`);
    for (const failure of result.failedRequests) lines.push(`- **failed request** ${failure}`);
    lines.push(`- screenshot: ${result.screenshot}`, "");
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args["base-url"] ?? "http://localhost:3000").replace(/\/$/, "");
  const outDir = typeof args.out === "string" ? args.out : "ui-audit";
  const touchWidth = Number(args["touch-width"] ?? 768);
  const routes = String(args.routes ?? "/").split(",").map((route) => route.trim()).filter(Boolean);
  const viewports = String(args.viewports ?? DEFAULT_VIEWPORTS).split(",").map((entry) => {
    const [width, height] = entry.trim().split("x").map(Number);
    if (!width || !height) throw new Error(`bad viewport "${entry}", expected WxH`);
    return { width, height };
  });
  const wantsLogin = typeof args["login-url"] === "string";

  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const viewport of viewports) {
      const isTouch = viewport.width <= touchWidth;
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 2,
        isMobile: isTouch,
        hasTouch: isTouch,
        ...(typeof args["storage-state"] === "string" ? { storageState: args["storage-state"] } : {}),
      });
      if (wantsLogin) await signIn(context, baseUrl, args);
      for (const route of routes) {
        results.push(await visit(context, baseUrl, route, viewport, touchWidth, outDir));
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(outDir, "report.md"), toMarkdown(results));

  const high = results.flatMap((result) => result.issues).filter((issue) => issue.severity === "high").length;
  console.log(`Audited ${results.length} page views. High: ${high}. Report: ${path.join(outDir, "report.md")}`);
  process.exitCode = high > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
