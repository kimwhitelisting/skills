from __future__ import annotations

import re
import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")
TARGET_PREFIX = "team_share_ko__"
WRAP_WIDTH = 98


def _find_top_frontmatter(lines: list[str]) -> tuple[int, int] | None:
    max_probe = min(12, len(lines))
    for start in range(max_probe):
        if lines[start].strip() != "---":
            continue
        for end in range(start + 1, min(start + 120, len(lines))):
            if lines[end].strip() == "---":
                between = lines[start + 1 : end]
                if any(":" in line for line in between):
                    return start, end
                return None
        return None
    return None


def _normalize_field_name(raw_key: str) -> str:
    key = raw_key.strip().lower()
    compact = re.sub(r"[^a-z0-9가-힣]", "", key)
    if "name" in compact or "이름" in compact:
        return "name"
    if "description" in compact or "설명" in compact:
        return "description"
    if "license" in compact or "licence" in compact or "라이선스" in compact:
        return "license"
    return ""


def _parse_frontmatter(meta_lines: list[str]) -> dict[str, str]:
    buckets: dict[str, list[str]] = {}
    current_key = ""

    key_value_re = re.compile(r"^([A-Za-z0-9가-힣_-]+)\s*:\s*(.*)$")
    for raw in meta_lines:
        line = raw.rstrip()
        if not line.strip():
            continue
        m = key_value_re.match(line.strip())
        if m:
            field = _normalize_field_name(m.group(1))
            value = m.group(2).strip()
            if field:
                current_key = field
                buckets.setdefault(field, [])
                if value:
                    buckets[field].append(value)
            else:
                current_key = ""
            continue
        if current_key:
            buckets[current_key].append(line.strip())

    def finish(parts: list[str]) -> str:
        text = " ".join(part for part in parts if part).strip()
        if not text:
            return ""
        if (text.startswith('"') and text.endswith('"')) or (
            text.startswith("'") and text.endswith("'")
        ):
            text = text[1:-1].strip()
        text = text.replace(r"\"", '"').replace(r"\'", "'")
        text = re.sub(r"\s+", " ", text).strip()
        return text

    return {
        "name": finish(buckets.get("name", [])),
        "description": finish(buckets.get("description", [])),
        "license": finish(buckets.get("license", [])),
    }


def _remove_existing_info_section(lines: list[str]) -> list[str]:
    start = -1
    for i, line in enumerate(lines):
        if line.strip() == "## 문서 정보":
            start = i
            break
    if start < 0:
        return lines

    end = start + 1
    while end < len(lines):
        if lines[end].startswith("## ") and lines[end].strip() != "## 문서 정보":
            break
        end += 1
    while end < len(lines) and not lines[end].strip():
        end += 1
    return lines[:start] + lines[end:]


def _wrap_bullet(label: str, value: str) -> list[str]:
    prefix = f"- **{label}**: "
    if label == "이름":
        shown = value if value else "SKILL"
        return [f"{prefix}`{shown}`"]
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


def _inject_info_block(lines: list[str], meta: dict[str, str]) -> list[str]:
    h1_idx = next((i for i, line in enumerate(lines) if line.startswith("# ")), -1)
    if h1_idx < 0:
        return lines

    title = (meta.get("name") or "").strip()
    if title and title.upper() != "SKILL":
        lines[h1_idx] = f"# {title}"

    tail = lines[h1_idx + 1 :]
    while tail and not tail[0].strip():
        tail = tail[1:]

    block: list[str] = ["## 문서 정보", ""]
    block.extend(_wrap_bullet("이름", meta.get("name", "")))
    block.extend(_wrap_bullet("설명", meta.get("description", "")))
    block.extend(_wrap_bullet("라이선스", meta.get("license", "")))
    block.extend(["", ""])

    return lines[: h1_idx + 1] + [""] + block + tail


def main() -> None:
    changed = 0
    for path in sorted(DOCS_ROOT.glob(f"{TARGET_PREFIX}*.md")):
        original = path.read_text(encoding="utf-8-sig")
        lines = original.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        meta = {"name": "", "description": "", "license": ""}
        had_frontmatter = False

        span = _find_top_frontmatter(lines)
        if span is not None:
            start, end = span
            meta = _parse_frontmatter(lines[start + 1 : end])
            lines = lines[:start] + lines[end + 1 :]
            had_frontmatter = True

        if had_frontmatter:
            lines = _remove_existing_info_section(lines)
            if any(meta.values()):
                lines = _inject_info_block(lines, meta)

        text = "\n".join(line.rstrip() for line in lines)
        text = text.strip("\n") + "\n"

        if text != original.replace("\r\n", "\n").replace("\r", "\n"):
            path.write_text(text, encoding="utf-8")
            changed += 1

    print(f"changed={changed}")


if __name__ == "__main__":
    main()
