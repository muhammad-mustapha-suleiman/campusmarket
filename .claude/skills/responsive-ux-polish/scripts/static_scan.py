#!/usr/bin/env python3
"""Static UI scan for web projects (React/Next, Vue/Nuxt, Svelte, Astro, plain HTML/CSS).

Reads markup and style files and reports patterns that tend to break on small
screens, hurt touch use, or make an interface look machine-made. It is a fast
first pass that needs no browser. It cannot see layout, so every hit is a lead
to read the code around, not proof of a bug.

Usage:
  python static_scan.py [PATH ...] [--json OUT] [--compare BEFORE.json]
                        [--min-severity low|medium|high] [--fail-on high]

With no PATH it scans the usual source folders it finds (src, app, components,
pages, routes, templates, public) or the current directory if none exist.
--compare prints how the counts moved since an earlier --json run.
Class-name rules assume Tailwind-style utilities; they simply find nothing in
projects that do not use them.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2}
SKIP_DIRS = {"node_modules", ".next", ".nuxt", ".svelte-kit", ".output", "dist", "build",
             ".git", "coverage", ".turbo", "vendor", "__pycache__"}
MARKUP_EXT = {".tsx", ".jsx", ".vue", ".svelte", ".astro", ".html", ".htm", ".erb", ".twig", ".njk", ".hbs", ".liquid"}
STYLE_EXT = {".css", ".scss", ".sass", ".less"}
DEFAULT_ROOT_CANDIDATES = ["src", "app", "components", "pages", "routes", "templates",
                           "resources/views", "public"]

# A utility class that is not behind a breakpoint or state variant.
BARE = r"(?<![:\w\[-])"

SLOP_PHRASES = [
    "seamless", "unlock", "elevate your", "streamline", "effortless",
    "empower", "supercharge", "revolutioni", "cutting-edge", "dive in",
    "get started today", "welcome back!", "your journey", "next-level",
    "powerful features", "all-in-one", "take your", "reimagine",
]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2705\u274C]")
CLICK_ATTR = r"(onClick=|@click|on:click|onclick=|v-on:click)"


@dataclass
class Finding:
    rule: str
    severity: str
    file: str
    line: int
    message: str


def line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def tag_end(text: str, start: int) -> int:
    """Index of the '>' that closes the tag opened at `start`, skipping quoted
    strings and {braces} so arrow functions and expressions do not end it early."""
    depth = 0
    quote = ""
    i = start
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == quote and text[i - 1] != "\\":
                quote = ""
        elif ch in "\"'`":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif ch == ">" and depth == 0 and text[i - 1] != "=":
            return i
        i += 1
    return len(text)


def tags(text: str, name: str):
    """Yield (start_index, tag_text) for every <name ...> opening tag."""
    for match in re.finditer(rf"<{name}(?=[\s/>])", text):
        yield match.start(), text[match.start(): tag_end(text, match.start()) + 1]


def scan_markup_lines(text: str, rel: str, out: list[Finding]) -> None:
    for number, line in enumerate(text.split("\n"), 1):
        def add(rule: str, severity: str, message: str) -> None:
            out.append(Finding(rule, severity, rel, number, message))

        if re.search(rf"{BARE}(min-h|h|max-h|w)-screen\b", line):
            add("viewport-units", "medium",
                "100vh/100vw includes mobile browser chrome and scrollbars; "
                "use dvh units (min-h-dvh / h-dvh) and w-full.")

        for m in re.finditer(rf"{BARE}(w|min-w)-\[(\d{{3,4}})px\]", line):
            px = int(m.group(2))
            if px >= 320:
                add("fixed-width", "high" if px >= 360 else "medium",
                    f"{m.group(0)} is wider than a 320-360px phone; "
                    "use max-w-* with w-full or a responsive prefix.")

        for m in re.finditer(rf"{BARE}grid-cols-(\d+)\b", line):
            cols = int(m.group(1))
            if cols >= 3:
                add("grid-no-breakpoint", "high",
                    f"grid-cols-{cols} applies at every width; start at "
                    "grid-cols-1 and add sm:/md:/lg: steps.")
            elif cols == 2:
                add("grid-two-up", "low",
                    "Two columns at 320px leave about 140px each; check long "
                    "values wrap and nothing is clipped.")

        for m in re.finditer(r"text-\[(\d+)px\]", line):
            if int(m.group(1)) < 12:
                add("tiny-text", "medium",
                    f"{m.group(0)} is below 12px; hard to read outdoors on a "
                    "mid-range phone.")

        if re.search(rf"<(div|span|li|p|section|td|img)\b[^>]*{CLICK_ATTR}", line):
            add("click-on-non-control", "high",
                "A click handler on a non-interactive element is invisible to "
                "keyboards and screen readers; use <button> or <a>.")

        if re.search(r"<(button|Button|Link|a)\b", line) and re.search(
                rf"{BARE}(h|size)-(5|6|7|8|9)\b", line) and "min-h-" not in line:
            add("small-tap-target", "medium",
                "Control smaller than 44px; add padding or min-h-11 so a "
                "thumb can hit it.")

        if re.search(r"user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b", line):
            add("zoom-blocked", "high",
                "Viewport meta blocks pinch zoom; people who need larger text "
                "cannot get it.")

        if "bg-gradient-to-" in line or "bg-linear-to-" in line:
            colour = re.search(
                r"(from|via|to)-(purple|violet|indigo|fuchsia|pink|blue)-\d+", line)
            add("gradient", "medium" if colour else "low",
                "Gradient fill" + (" in a stock purple/blue palette" if colour else "") +
                "; a flat colour from the project's palette often reads as more deliberate.")

        for pattern, rule, message in [
            (r"backdrop-blur", "glass-effect", "Backdrop blur is costly on low-end phones and rarely earns its place."),
            (r"shadow-(xl|2xl)\b", "heavy-shadow", "Heavy shadow; check it matches how the rest of the product handles elevation."),
            (r"rounded-(3xl|\[(2[4-9]|[3-9]\d)px\])", "over-rounded", "Very large radius; check it matches the project's radius."),
        ]:
            if re.search(pattern, line):
                add(rule, "low", message)

        if re.search(r"\bfixed\b", line) and re.search(r"\bbottom-0\b", line) \
                and "safe-area" not in line and "env(" not in line:
            add("fixed-bottom-no-inset", "low",
                "Fixed bottom bar without a safe-area inset; the home "
                "indicator can cover it on iPhones.")

        if re.search(r"animate-(bounce|ping)\b", line):
            add("decorative-motion", "low",
                "Looping animation draws the eye for no reason.")

        lowered = line.lower()
        for phrase in SLOP_PHRASES:
            if phrase in lowered and ('"' in line or ">" in line):
                add("generic-copy", "low",
                    f"Stock marketing phrase '{phrase}'; say what actually happens.")
                break

        if EMOJI.search(line) and ('"' in line or ">" in line):
            add("emoji-in-ui", "low",
                "Emoji used as interface content; use the project's icon set "
                "or plain words.")


def scan_markup_tags(text: str, rel: str, out: list[Finding]) -> None:
    for start, tag in tags(text, "button"):
        if not re.search(r"\btype=|:type=|v-bind:type", tag):
            out.append(Finding("button-no-type", "medium", rel, line_of(text, start),
                               "<button> without type defaults to submit and can "
                               "send a form by accident."))

    for name in ("img", "Image", "NuxtImg", "nuxt-img"):
        for start, tag in tags(text, name):
            line = line_of(text, start)
            if not re.search(r"\balt=|:alt=|\{\.\.\.", tag):
                out.append(Finding("image-no-alt", "medium", rel, line,
                                   f"<{name}> without alt text."))
            sized = re.search(r"\b(width|height|fill|aspect|style|sizes)\b|class(Name)?=\"[^\"]*(aspect-|\b[wh]-|size-)", tag)
            if name == "img" and not sized:
                out.append(Finding("image-no-size", "low", rel, line,
                                   "<img> with no width/height or sizing class; the page "
                                   "jumps when it loads."))
            if re.search(r"\bpriority\b|fetchpriority=\"high\"|loading=\"eager\"", tag):
                above = "\n".join(text[:start].split("\n")[-15:])
                if re.search(r"\bhidden\b", above) and re.search(r"\b(sm|md|lg|xl):(block|flex|grid)\b", above):
                    out.append(Finding("hidden-priority-image", "medium", rel, line,
                                       "A high-priority image sits inside an element hidden "
                                       "on small screens; phones still download it. Drop the "
                                       "priority, or render it only where it shows."))

    for name in ("Input", "input"):
        for start, tag in tags(text, name):
            if re.search(r'type="(file|checkbox|radio|hidden|submit|button|range)"', tag):
                continue
            if not re.search(r"autoComplete|autocomplete", tag) and not re.search(r"\{\.\.\.(field|props|rest)\}", tag):
                out.append(Finding("input-no-autocomplete", "low", rel, line_of(text, start),
                                   "Input without autocomplete; browsers and password "
                                   "managers cannot help the user fill it."))


def scan_markup_file(text: str, rel: str, out: list[Finding]) -> None:
    table = re.search(r"<table\b", text)
    if table and not re.search(r"overflow-x-auto|overflow-auto|overflow-x:\s*(auto|scroll)", text):
        out.append(Finding("table-no-scroll", "medium", rel, line_of(text, table.start()),
                           "Raw <table> with no horizontal scroll wrapper; it will "
                           "push the page sideways on a phone. Prefer stacked cards "
                           "below md."))

    if rel.endswith((".html", ".htm")) and "<html" in text.lower():
        if not re.search(r"<meta[^>]+name=[\"']viewport[\"']", text, re.I):
            out.append(Finding("no-viewport-meta", "high", rel, 1,
                               "No viewport meta tag; phones render this page at desktop "
                               "width and shrink it."))
        if not re.search(r"<html[^>]+\blang=", text, re.I):
            out.append(Finding("no-html-lang", "low", rel, 1,
                               "<html> has no lang attribute; screen readers guess the language."))

    small = len(re.findall(rf"{BARE}text-xs\b", text))
    if small >= 8:
        out.append(Finding("text-xs-heavy", "low", rel, 1,
                           f"{small} uses of text-xs; confirm nothing the user must "
                           "read is set at 12px."))


WIDE_MEDIA = re.compile(r"@media[^{]*\(\s*min-width:\s*(\d+)px")


def scan_style_file(text: str, rel: str, out: list[Finding]) -> None:
    depth = 0
    wide_media_depth: int | None = None  # brace depth at which a wide-screen @media opened
    for number, line in enumerate(text.split("\n"), 1):
        def add(rule: str, severity: str, message: str) -> None:
            out.append(Finding(rule, severity, rel, number, message))

        media = WIDE_MEDIA.search(line)
        if media and int(media.group(1)) >= 480 and wide_media_depth is None:
            wide_media_depth = depth
        in_wide_screen = wide_media_depth is not None
        depth += line.count("{") - line.count("}")
        if wide_media_depth is not None and depth <= wide_media_depth:
            wide_media_depth = None

        if re.search(r"\b(min-|max-)?height:\s*100vh\b", line):
            add("viewport-units", "medium",
                "100vh includes mobile browser chrome; use 100dvh (with a 100vh "
                "fallback line above it if older browsers matter).")
        m = re.search(r"(?<![-\w])width:\s*(\d{3,4})px", line)
        if m and int(m.group(1)) >= 360 and not in_wide_screen:
            add("fixed-width", "high", f"Fixed width {m.group(1)}px is wider than a "
                "phone; use max-width with width: 100%.")
        m = re.search(r"font-size:\s*(\d+(?:\.\d+)?)px", line)
        if m and float(m.group(1)) < 12:
            add("tiny-text", "medium", f"font-size {m.group(1)}px is below 12px.")
        if re.search(r"overflow-x:\s*hidden", line):
            add("overflow-masked", "low",
                "overflow-x: hidden often hides a layout overflow instead of "
                "fixing it, and clips content users may need.")
        if re.search(r"user-scalable\s*=\s*no", line):
            add("zoom-blocked", "high", "Blocks pinch zoom.")

    removes_outline = re.search(r"outline:\s*(none|0)\b", text)
    restores_focus = re.search(r":focus-visible|:focus\s*\{[^}]*(box-shadow|outline)", text)
    if removes_outline and not restores_focus:
        out.append(Finding("focus-ring-removed", "medium", rel, line_of(text, removes_outline.start()),
                           "outline removed with no visible replacement; keyboard users "
                           "cannot see where they are."))


def default_roots() -> list[str]:
    found = [c for c in DEFAULT_ROOT_CANDIDATES if Path(c).is_dir()]
    return found or ["."]


def iter_files(roots: list[str]):
    seen = set()
    for root in roots:
        base = Path(root)
        candidates = [base] if base.is_file() else (sorted(base.rglob("*")) if base.exists() else [])
        if not base.exists():
            print(f"warning: {root} does not exist", file=sys.stderr)
        for path in candidates:
            is_blade = path.name.endswith(".blade.php")
            if (path.suffix in MARKUP_EXT | STYLE_EXT or is_blade) and not (set(path.parts) & SKIP_DIRS):
                key = path.resolve()
                if key not in seen:
                    seen.add(key)
                    yield path


def run(roots: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_files(roots):
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.as_posix()
        if path.suffix in STYLE_EXT:
            scan_style_file(text, rel, findings)
        else:
            scan_markup_lines(text, rel, findings)
            scan_markup_tags(text, rel, findings)
            scan_markup_file(text, rel, findings)
    findings.sort(key=lambda f: (-SEVERITY_RANK[f.severity], f.file, f.line))
    return findings


def print_report(findings: list[Finding], minimum: str) -> None:
    shown = [f for f in findings if SEVERITY_RANK[f.severity] >= SEVERITY_RANK[minimum]]
    current = ""
    for f in shown:
        if f.severity != current:
            current = f.severity
            print(f"\n== {current.upper()} ==")
        print(f"{f.file}:{f.line}  [{f.rule}]  {f.message}")
    totals = Counter(f.severity for f in findings)
    print(f"\n{totals['high']} high, {totals['medium']} medium, {totals['low']} low "
          f"({len(findings)} total)")


def print_compare(findings: list[Finding], before_path: str) -> None:
    before = Counter(json.loads(Path(before_path).read_text())["by_rule"])
    now = Counter(f.rule for f in findings)
    print("\nChange since baseline (rule: before -> now)")
    for rule in sorted(set(before) | set(now)):
        if before[rule] != now[rule]:
            print(f"  {rule}: {before[rule]} -> {now[rule]}")
    if before == now:
        print("  no change")


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--json", dest="json_out")
    parser.add_argument("--compare")
    parser.add_argument("--min-severity", default="low", choices=SEVERITY_RANK)
    parser.add_argument("--fail-on", choices=SEVERITY_RANK)
    args = parser.parse_args()

    findings = run(args.paths or default_roots())
    print_report(findings, args.min_severity)

    if args.json_out:
        payload = {
            "findings": [asdict(f) for f in findings],
            "by_rule": dict(Counter(f.rule for f in findings)),
        }
        Path(args.json_out).write_text(json.dumps(payload, indent=2))
    if args.compare:
        print_compare(findings, args.compare)
    if args.fail_on and any(
            SEVERITY_RANK[f.severity] >= SEVERITY_RANK[args.fail_on] for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
