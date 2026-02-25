from __future__ import annotations

import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")
WRAP_WIDTH = 96
EXCLUDE = {
    "문서 정보",
    "빠른 안내",
    "빠른 읽기",
}


def _is_list_line(line: str) -> bool:
    stripped = line.lstrip()
    if not stripped:
        return False
    if stripped.startswith(("- ", "* ", "+ ")):
        return True
    head = stripped.split(" ", 1)[0]
    return head[:-1].isdigit() and head.endswith(".")


def _remove_existing_quick_section(lines: list[str]) -> list[str]:
    start = -1
    for i, line in enumerate(lines):
        if line.strip() in {"## 빠른 안내", "## 빠른 읽기"}:
            start = i
            break
    if start < 0:
        return lines

    end = start + 1
    while end < len(lines):
        if lines[end].startswith("## ") and lines[end].strip() not in {
            "## 빠른 안내",
            "## 빠른 읽기",
        }:
            break
        end += 1
    while end < len(lines) and not lines[end].strip():
        end += 1
    return lines[:start] + lines[end:]


def _find_insert_index(lines: list[str]) -> int:
    h1_idx = next((i for i, line in enumerate(lines) if line.startswith("# ")), -1)
    if h1_idx < 0:
        return 0

    i = h1_idx + 1
    while i < len(lines) and not lines[i].strip():
        i += 1

    if i < len(lines) and lines[i].strip() == "## 문서 정보":
        j = i + 1
        while j < len(lines):
            if lines[j].startswith("## ") and lines[j].strip() != "## 문서 정보":
                break
            j += 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        return j

    return h1_idx + 1


def _extract_first_paragraph(lines: list[str], start: int) -> str:
    i = start
    in_fence = False
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            i += 1
            continue
        if in_fence:
            i += 1
            continue
        if not stripped:
            i += 1
            continue
        if (
            stripped.startswith("#")
            or stripped.startswith("|")
            or stripped.startswith(">")
            or stripped.startswith("!!!")
            or stripped.startswith("???")
            or _is_list_line(line)
        ):
            i += 1
            continue

        block: list[str] = []
        while i < len(lines):
            current = lines[i]
            cur = current.strip()
            if not cur:
                break
            if (
                cur.startswith("#")
                or cur.startswith("|")
                or cur.startswith(">")
                or cur.startswith("!!!")
                or cur.startswith("???")
                or _is_list_line(current)
            ):
                break
            block.append(cur)
            i += 1
        text = " ".join(block).strip()
        if text:
            return text
    return ""


def _collect_h2(lines: list[str]) -> list[str]:
    headings: list[str] = []
    for line in lines:
        if not line.startswith("## "):
            continue
        h = line[3:].strip()
        if h in EXCLUDE:
            continue
        headings.append(h)
    return headings


def _wrap(prefix: str, value: str) -> list[str]:
    if not value:
        return [f"{prefix}-"]
    wrapped = textwrap.fill(
        value,
        width=WRAP_WIDTH,
        initial_indent=prefix,
        subsequent_indent=" " * len(prefix),
        break_long_words=False,
        break_on_hyphens=False,
    )
    return wrapped.splitlines()


def _build_quick_block(summary: str, headings: list[str]) -> list[str]:
    lines: list[str] = ["## 빠른 안내", ""]
    lines.extend(_wrap("- **문서 요약**: ", summary))
    if headings:
        lines.extend(_wrap("- **핵심 섹션**: ", ", ".join(headings[:6])))
    else:
        lines.append("- **핵심 섹션**: -")
    if headings:
        lines.append("")
        lines.append("### 권장 읽기 순서")
        for idx, h in enumerate(headings[:5], start=1):
            lines.append(f"{idx}. {h}")
    lines.extend(["", ""])
    return lines


def _process(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    lines = original.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = _remove_existing_quick_section(lines)

    insert_idx = _find_insert_index(lines)
    summary = _extract_first_paragraph(lines, insert_idx)
    headings = _collect_h2(lines)
    quick = _build_quick_block(summary, headings)

    lines = lines[:insert_idx] + quick + lines[insert_idx:]
    text = "\n".join(line.rstrip() for line in lines)
    text = text.strip("\n") + "\n"
    if text != original.replace("\r\n", "\n").replace("\r", "\n"):
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for path in sorted(DOCS_ROOT.glob("*.md")):
        if _process(path):
            changed += 1
    print(f"restructured={changed}")


if __name__ == "__main__":
    main()
