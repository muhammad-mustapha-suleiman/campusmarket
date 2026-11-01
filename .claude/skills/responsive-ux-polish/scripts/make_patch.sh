#!/bin/sh
# Writes the working-tree changes as a patch and proves it applies to a clean
# checkout of HEAD. Run from inside the git repository.
#   sh make_patch.sh path/to/output.patch
#
# Not a git repository? Copy the project before you edit it, then:
#   diff -ruN --exclude=node_modules --exclude=.git original/ edited/ > changes.patch
set -eu

out="${1:?usage: make_patch.sh OUTPUT.patch}"
case "$out" in /*) ;; *) out="$(pwd)/$out" ;; esac

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository. Use the diff -ruN fallback in this script's header." >&2
  exit 3
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"
git add -N . >/dev/null 2>&1
git diff --binary -- . ':(exclude)*.tsbuildinfo' > "$out"

if [ ! -s "$out" ]; then
  echo "No changes to write." >&2
  exit 1
fi

check_dir="$(mktemp -d)"
trap 'rm -rf "$check_dir"' EXIT
git archive HEAD | tar -x -C "$check_dir"
(cd "$check_dir" && git init -q . && git apply --check "$out")

echo "Patch written to $out and applies cleanly to HEAD."
git diff --stat -- . ':(exclude)*.tsbuildinfo' | tail -1
