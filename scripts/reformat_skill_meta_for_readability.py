from __future__ import annotations

import re
import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")


FRONT_RE = re.compile(r"^\ufeff?---\n(.*?)\n---\n?", re.S)


def _parse_frontmatter(front: str) -> dict[str, str]:
    out = {"name": "", "description": "", "license": ""}
    for raw in front.splitlines():
        line = raw.strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        key = k.strip().lower()
        val = v.strip().strip("\"'")
        if key in {"name", "이름"}:
            out["name"] = val
        elif key in {"description", "설명"}:
            out["description"] = val
        elif key in {"license", "licence", "라이선스", "라이센스"}:
            out["license"] = val
    return out


def _parse_current_info_block(text: str) -> tuple[dict[str, str], str]:
    """
    Parse existing top block (!!! info ...) and return meta + remaining body.
    """
    lines = text.splitlines()
    heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("# "):
            heading_idx = i
            break
    if heading_idx is None:
        return {"name": "", "description": "", "license": ""}, text

    top = "\n".join(lines[:heading_idx])
    body = "\n".join(lines[heading_idx:]).lstrip("\n")
    meta = {"name": "", "description": "", "license": ""}

    # Name: first backtick value
    m_name = re.search(r"`([^`]+)`", top)
    if m_name:
        meta["name"] = m_name.group(1).strip()

    # Description: robustly capture from '설명' to '라이선스' line
    m_desc = re.search(r"설명[^:\n]*:\s*(.*?)(?:\n\s*\*\*라이선스\*\*|\n\s*-\s*\*\*라이선스\*\*)", top, re.S)
    if m_desc:
        desc = m_desc.group(1)
        desc = re.sub(r"^\s*[-*]\s*", "", desc.strip())
        desc = re.sub(r"\n\s+", " ", desc).strip()
        meta["description"] = desc

    m_license = re.search(r"라이선스[^:\n]*:\s*(.+)", top)
    if m_license:
        meta["license"] = m_license.group(1).strip()

    return meta, body


def _build_human_readable_meta(name: str, description: str, license_text: str) -> str:
    wrapped = textwrap.fill(description, width=96)
    return (
        "## 문서 정보\n\n"
        f"- **이름**: `{name}`\n"
        f"- **설명**: {wrapped}\n"
        f"- **라이선스**: {license_text}\n\n"
    )


def main() -> None:
    changed = 0
    for path in sorted(DOCS_ROOT.glob("team_share_ko__*.md")):
        text = path.read_text(encoding="utf-8", errors="replace")
        meta = {"name": "", "description": "", "license": ""}
        body = text

        m = FRONT_RE.match(text)
        if m:
            meta = _parse_frontmatter(m.group(1))
            body = text[m.end() :].lstrip("\n")
        elif text.startswith("!!! info "):
            meta, body = _parse_current_info_block(text)
        else:
            continue

        if not meta["name"]:
            if "__" in path.stem:
                meta["name"] = path.stem.split("__")[-1]
            else:
                meta["name"] = path.stem
        if not meta["description"]:
            meta["description"] = "-"
        if not meta["license"]:
            meta["license"] = "-"

        new_text = _build_human_readable_meta(
            meta["name"], meta["description"], meta["license"]
        ) + body
        if not new_text.endswith("\n"):
            new_text += "\n"
        path.write_text(new_text, encoding="utf-8")
        changed += 1

    print(f"changed={changed}")


if __name__ == "__main__":
    main()
