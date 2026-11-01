#!/usr/bin/env python3
"""Describe a web project so a UI review starts from facts, not guesses.

Reports the package manager, framework, styling approach, component library,
likely theme/token files, route folders, helpful scripts (dev, build, lint,
typecheck, test), agent notes (AGENTS.md and similar) and, from a monorepo
root, every package that looks like a web app.

Usage: python detect_project.py [DIR]      (default: current directory)
Standard library only.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SKIP = {"node_modules", ".git", ".next", ".nuxt", ".svelte-kit", "dist", "build", "coverage", ".turbo", ".output"}

FRAMEWORKS = {
    "next": "Next.js", "nuxt": "Nuxt", "@remix-run/react": "Remix", "react-router": "React Router",
    "astro": "Astro", "@sveltejs/kit": "SvelteKit", "svelte": "Svelte", "vue": "Vue",
    "@angular/core": "Angular", "react": "React", "solid-js": "Solid", "preact": "Preact",
    "vite": "Vite", "gatsby": "Gatsby", "@11ty/eleventy": "Eleventy",
}
COMPONENT_LIBS = {
    "@mui/material": "MUI", "@chakra-ui/react": "Chakra UI", "antd": "Ant Design",
    "@mantine/core": "Mantine", "bootstrap": "Bootstrap", "react-bootstrap": "React-Bootstrap",
    "daisyui": "daisyUI", "@radix-ui/react-dialog": "Radix UI", "radix-ui": "Radix UI",
    "@headlessui/react": "Headless UI", "@heroui/react": "HeroUI", "primereact": "PrimeReact",
    "vuetify": "Vuetify", "element-plus": "Element Plus", "@nextui-org/react": "NextUI",
    "@angular/material": "Angular Material", "flowbite": "Flowbite", "lucide-react": "lucide icons",
}
STYLING = {
    "tailwindcss": "Tailwind CSS", "sass": "Sass", "styled-components": "styled-components",
    "@emotion/react": "Emotion", "@vanilla-extract/css": "vanilla-extract", "@stitches/react": "Stitches",
    "unocss": "UnoCSS", "@pandacss/dev": "Panda CSS", "less": "Less",
}
TOKEN_CANDIDATES = [
    "app/globals.css", "src/app/globals.css", "src/index.css", "src/styles/globals.css",
    "src/styles/global.css", "styles/globals.css", "src/app.css", "src/assets/main.css",
    "src/assets/styles/main.scss", "tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs",
    "theme.ts", "src/theme.ts", "src/theme/index.ts", "src/styles/theme.ts", "components.json",
]
ROUTE_DIRS = ["app", "src/app", "pages", "src/pages", "src/routes", "routes", "src/views", "resources/views", "templates"]
NOTE_FILES = ["AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md", ".cursorrules", "docs/STYLEGUIDE.md", "STYLEGUIDE.md"]
USEFUL_SCRIPTS = ("dev", "start", "build", "lint", "typecheck", "type-check", "check", "test", "format")


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def find_packages(root: Path, depth: int = 3) -> list[Path]:
    found = []
    def walk(directory: Path, level: int) -> None:
        if (directory / "package.json").exists():
            found.append(directory)
        if level >= depth:
            return
        for child in sorted(directory.iterdir()):
            if child.is_dir() and child.name not in SKIP and not child.name.startswith("."):
                walk(child, level + 1)
    walk(root, 0)
    return found


def describe(directory: Path) -> dict:
    package = load_json(directory / "package.json")
    deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}

    def pick(table: dict) -> list[str]:
        return sorted({label for key, label in table.items() if key in deps})

    frameworks = pick(FRAMEWORKS)
    tailwind = deps.get("tailwindcss")
    styling = pick(STYLING)
    if tailwind:
        styling = [f"Tailwind CSS {tailwind}" if s == "Tailwind CSS" else s for s in styling]
    if (directory / "components.json").exists():
        frameworks_note = "shadcn/ui (components.json present)"
    else:
        frameworks_note = None

    if (directory / "pnpm-lock.yaml").exists() or (directory.parent / "pnpm-lock.yaml").exists():
        manager = "pnpm"
    elif (directory / "yarn.lock").exists():
        manager = "yarn"
    elif (directory / "bun.lockb").exists() or (directory / "bun.lock").exists():
        manager = "bun"
    else:
        manager = "npm"

    scripts = {k: v for k, v in package.get("scripts", {}).items() if k in USEFUL_SCRIPTS}
    css_modules = sum(
        1
        for p in directory.rglob("*.module.*")
        if p.suffix in {".css", ".scss", ".sass", ".less"} and not (set(p.parts) & SKIP)
    )
    return {
        "path": str(directory),
        "name": package.get("name"),
        "package_manager": manager,
        "frameworks": frameworks,
        "styling": styling + (["CSS Modules"] if css_modules else []),
        "component_libraries": pick(COMPONENT_LIBS) + ([frameworks_note] if frameworks_note else []),
        "theme_or_token_files": [c for c in TOKEN_CANDIDATES if (directory / c).exists()],
        "route_folders": [r for r in ROUTE_DIRS if (directory / r).is_dir()],
        "agent_notes": [n for n in NOTE_FILES if (directory / n).exists()],
        "scripts": scripts,
        "browser_test_tools": pick({"@playwright/test": "Playwright", "playwright": "Playwright", "cypress": "Cypress", "puppeteer": "Puppeteer"}),
        "has_index_html": (directory / "index.html").exists() or (directory / "public/index.html").exists(),
    }


def is_web_app(info: dict) -> bool:
    return bool(info["frameworks"] or info["styling"] or info["has_index_html"])


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.is_dir():
        print(f"{root} is not a directory", file=sys.stderr)
        return 2

    packages = [describe(p) for p in find_packages(root)]
    apps = [p for p in packages if is_web_app(p)]
    if not packages and (root / "index.html").exists():
        apps = [describe(root)]

    report = {
        "root": str(root),
        "git_repo": (root / ".git").exists() or any((p / ".git").exists() for p in root.parents),
        "monorepo": len(apps) > 1 or (root / "pnpm-workspace.yaml").exists(),
        "web_apps": apps,
    }
    if not apps:
        report["note"] = "No web app found. Point this at the folder that holds package.json or index.html."
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
