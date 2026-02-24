from __future__ import annotations

import re
import sys
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")
FLAT_PREFIX = "team_share_ko__"
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
URL_RE = re.compile(r"https?://\S+")
LONG_LINE_WARN = 140


def _to_virtual_path(flat_name: str) -> str:
    return flat_name[len(FLAT_PREFIX) :].replace("__", "/")


def _to_flat_name(virtual_path: str) -> str:
    return f"{FLAT_PREFIX}{virtual_path.replace('/', '__')}"


def _check_file(path: Path, existing: set[str]) -> tuple[list[str], list[str]]:
    issues: list[str] = []
    warnings: list[str] = []
    raw = path.read_bytes()

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        return [f"[ENCODING] {path.name}: UTF-8 decode failed ({exc})"], warnings

    if raw.startswith(b"\xef\xbb\xbf"):
        issues.append(f"[BOM] {path.name}: UTF-8 BOM must be removed")

    lines = text.splitlines()
    first_nonempty = next((ln for ln in lines if ln.strip()), "")
    h1_count = sum(1 for ln in lines if ln.startswith("# "))

    if not first_nonempty.startswith("# "):
        issues.append(f"[H1] {path.name}: first non-empty line must be '# ...'")
    if h1_count != 1:
        issues.append(f"[H1] {path.name}: exactly one H1 required (found {h1_count})")
    if "!!! info " in text:
        issues.append(f"[META] {path.name}: legacy admonition metadata block found")
    # unresolved yaml frontmatter near top should be converted to readable section.
    probe_lines = lines[:80]
    max_probe = min(12, len(probe_lines))
    for i in range(max_probe):
        if probe_lines[i].strip() != "---":
            continue
        for j in range(i + 1, len(probe_lines)):
            if probe_lines[j].strip() == "---":
                between = probe_lines[i + 1 : j]
                if any(":" in row for row in between):
                    issues.append(
                        f"[META] {path.name}: unresolved frontmatter block near top"
                    )
                break
        break

    # readability warnings: very long prose lines outside code/table blocks.
    in_fence = False
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if len(line) <= LONG_LINE_WARN:
            continue
        if (
            stripped.startswith("|")
            or stripped.startswith(">")
            or stripped.startswith("#")
            or line.startswith("    ")
            or URL_RE.search(line)
            or "](" in line
        ):
            continue
        warnings.append(
            f"[READABILITY] {path.name}:{idx} line length {len(line)} (> {LONG_LINE_WARN})"
        )

    if path.name.startswith(FLAT_PREFIX):
        current_virtual = _to_virtual_path(path.name)
        current_dir = Path(current_virtual).parent
        for match in MD_LINK_RE.finditer(text):
            target = match.group(2).strip()
            low = target.lower()
            if target.startswith("#") or "://" in target or low.startswith("mailto:"):
                continue

            base = target
            if "#" in target:
                base = target.split("#", 1)[0]

            if not base.lower().endswith(".md"):
                continue

            if base.startswith(FLAT_PREFIX):
                if base not in existing:
                    issues.append(
                        f"[LINK] {path.name}: broken flattened md link -> {target}"
                    )
                continue

            resolved = str((current_dir / base).as_posix())
            parts: list[str] = []
            for part in resolved.split("/"):
                if part in {"", "."}:
                    continue
                if part == "..":
                    if parts:
                        parts.pop()
                    continue
                parts.append(part)
            normalized_virtual = "/".join(parts)
            flat_target = _to_flat_name(normalized_virtual)
            if flat_target not in existing:
                issues.append(
                    f"[LINK] {path.name}: broken local md link -> {target} "
                    f"(expected {flat_target})"
                )
    return issues, warnings


def main() -> int:
    files = sorted(DOCS_ROOT.glob("*.md"))
    existing = {p.name for p in files}
    all_issues: list[str] = []
    all_warnings: list[str] = []
    for path in files:
        issues, warnings = _check_file(path, existing)
        all_issues.extend(issues)
        all_warnings.extend(warnings)

    if all_issues:
        print("FAILED")
        for issue in all_issues:
            print(issue)
        print(f"\nTotal issues: {len(all_issues)}")
        return 1

    print("OK: all markdown quality checks passed")
    print(f"Checked files: {len(files)}")
    if all_warnings:
        print(f"Readability warnings: {len(all_warnings)}")
        for item in all_warnings[:30]:
            print(item)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
