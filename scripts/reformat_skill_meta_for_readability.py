from __future__ import annotations

import re
import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")
FRONT_RE = re.compile(r"^\ufeff?---\n(.*?)\n---\n?", re.S)


def _normalize_key(raw: str) -> str:
    key = raw.strip().lower().strip("*` ")
    compact = re.sub(r"[*`\s_\-]+", "", key)

    if compact in {"name", "이름", "?대쫫"} or "이름" in compact or "대쫫" in compact:
        return "name"
    if compact in {"description", "설명", "?ㅻ챸"} or "설명" in compact or "ㅻ챸" in compact:
        return "description"
    if (
        compact in {
            "license",
            "licence",
            "라이선스",
            "라이센스",
            "?쇱씠?좎뒪",
            "?쇱씠?쇱뒪",
        }
        or "license" in compact
        or "licence" in compact
        or "라이" in compact
        or "쇱씠" in compact
    ):
        return "license"
    return ""


def _parse_frontmatter(front: str) -> dict[str, str]:
    meta = {"name": "", "description": "", "license": ""}
    for raw in front.splitlines():
        line = raw.strip()
        if not line or ":" not in line:
            continue
        key_raw, value_raw = line.split(":", 1)
        field = _normalize_key(key_raw)
        if not field:
            continue
        meta[field] = value_raw.strip().strip("\"'")
    return meta


def _parse_info_admonition_top(text: str) -> tuple[dict[str, str], str]:
    t = text.lstrip("\ufeff")
    lines = t.splitlines()
    meta = {"name": "", "description": "", "license": ""}

    if not lines:
        return meta, t

    start = 0
    while start < len(lines) and not lines[start].strip():
        start += 1
    if start >= len(lines) or not lines[start].lstrip().startswith("!!! info"):
        return meta, t

    block_lines: list[str] = []
    i = start + 1
    while i < len(lines):
        line = lines[i]
        if line.startswith("    "):
            block_lines.append(line[4:])
            i += 1
            continue
        if not line.strip():
            block_lines.append("")
            i += 1
            continue
        break

    body = "\n".join(lines[i:]).lstrip("\n")
    current_field = ""
    for raw in block_lines:
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^\*{0,2}\s*([^:]+?)\s*\*{0,2}\s*:\s*(.*)$", line)
        if m:
            field = _normalize_key(m.group(1))
            value = m.group(2).strip().strip("`")
            if field:
                meta[field] = value
                current_field = field
            else:
                current_field = ""
            continue

        if current_field == "description":
            meta["description"] = (
                f"{meta['description']} {line}".strip()
                if meta["description"]
                else line
            )

    for k in meta:
        meta[k] = re.sub(r"\s+", " ", meta[k]).strip()

    return meta, body


def _parse_existing_meta_header(text: str) -> tuple[dict[str, str], str]:
    t = text.lstrip("\ufeff")
    lines = t.splitlines()
    meta = {"name": "", "description": "", "license": ""}
    if not lines or not lines[0].startswith("## "):
        return meta, t

    i = 1
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("- **") and ":" in line:
            left, right = line.split(":", 1)
            field = _normalize_key(left)
            if field:
                meta[field] = right.strip().strip("`")
            i += 1
            continue
        break

    body = "\n".join(lines[i:]).lstrip("\n")
    return meta, body


def _strip_legacy_block_if_duplicated(text: str) -> str:
    t = text.lstrip("\ufeff")
    if t.startswith("## ") and "!!! info " in t[:4000]:
        idx = t.find("!!! info ")
        if idx > 0:
            return t[idx:]
    return t


def _build_meta_header(name: str, description: str, license_text: str) -> str:
    wrapped = textwrap.fill(description, width=96)
    return (
        "## 문서 정보\n\n"
        f"- **이름**: `{name}`\n"
        f"- **설명**: {wrapped}\n"
        f"- **라이선스**: {license_text}\n\n"
    )


def _apply_fallbacks(meta: dict[str, str], path: Path) -> dict[str, str]:
    out = dict(meta)
    if not out["name"]:
        parts = path.stem.split("__")
        if parts and parts[-1].lower() == "skill" and len(parts) >= 2:
            out["name"] = parts[-2]
        elif parts:
            out["name"] = parts[-1]
        else:
            out["name"] = path.stem
    if not out["description"]:
        out["description"] = "-"
    if not out["license"]:
        out["license"] = "-"
    return out


def main() -> None:
    changed = 0
    for path in sorted(DOCS_ROOT.glob("team_share_ko__*.md")):
        original = path.read_text(encoding="utf-8", errors="replace")
        text = _strip_legacy_block_if_duplicated(original)

        meta = {"name": "", "description": "", "license": ""}
        body = text

        front_match = FRONT_RE.match(text)
        if front_match:
            meta = _parse_frontmatter(front_match.group(1))
            body = text[front_match.end() :].lstrip("\n")
        elif text.lstrip().startswith("!!! info "):
            meta, body = _parse_info_admonition_top(text)
        elif text.lstrip().startswith("## "):
            meta, body = _parse_existing_meta_header(text)
        else:
            continue

        fixed = _apply_fallbacks(meta, path)
        new_text = _build_meta_header(
            fixed["name"], fixed["description"], fixed["license"]
        ) + body
        if not new_text.endswith("\n"):
            new_text += "\n"

        if new_text != original:
            path.write_text(new_text, encoding="utf-8")
            changed += 1

    print(f"changed={changed}")


if __name__ == "__main__":
    main()
