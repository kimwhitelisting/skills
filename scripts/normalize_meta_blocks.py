from __future__ import annotations

import re
import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")


FRONTMATTER_RE = re.compile(r"^\ufeff?---\n(.*?)\n---\n?", re.S)


def _extract_meta_from_frontmatter(block: str) -> dict[str, str]:
    out = {"name": "", "description": "", "license": ""}
    for raw in block.splitlines():
        line = raw.strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        key = k.strip().lstrip("\ufeff").lower()
        val = v.strip().strip("\"'")
        if key in {"name", "이름"}:
            out["name"] = val
        elif key in {"description", "설명"}:
            out["description"] = val
        elif key in {"license", "licence", "라이선스", "라이센스"}:
            out["license"] = val
    return out


def _extract_meta_from_info_block(top_lines: list[str]) -> dict[str, str]:
    out = {"name": "", "description": "", "license": ""}
    for line in top_lines:
        stripped = line.strip()
        if re.match(r"^-?\s*\*\*이름\*\*:\s*", stripped):
            out["name"] = stripped.split(":", 1)[1].strip().strip("`")
        elif re.match(r"^-?\s*\*\*설명\*\*:\s*", stripped):
            out["description"] = stripped.split(":", 1)[1].strip()
        elif re.match(r"^-?\s*\*\*라이선스\*\*:\s*", stripped) or re.match(
            r"^-?\s*\*\*라이센스\*\*:\s*", stripped
        ):
            out["license"] = stripped.split(":", 1)[1].strip()
    return out


def _build_meta_block(name: str, description: str, license_text: str) -> str:
    wrapped_desc = textwrap.fill(description, width=88)
    wrapped_desc = "\n".join(f"    {line}" for line in wrapped_desc.splitlines())
    return (
        '!!! info "문서 정보"\n'
        f"    **이름**: `{name}`\n\n"
        "    **설명**:\n"
        f"{wrapped_desc}\n\n"
        f"    **라이선스**: {license_text}\n\n"
    )


def _split_top_block(text: str) -> tuple[list[str], str]:
    lines = text.splitlines()
    heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("# "):
            heading_idx = i
            break
    if heading_idx is None:
        return lines, ""
    return lines[:heading_idx], "\n".join(lines[heading_idx:]).lstrip("\n")


def normalize_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")

    # case 1: YAML frontmatter
    m = FRONTMATTER_RE.match(text)
    if m:
        meta = _extract_meta_from_frontmatter(m.group(1))
        body = text[m.end() :].lstrip("\n")
        name = meta["name"] or path.stem
        description = meta["description"] or "-"
        license_text = meta["license"] or "-"
        new_text = _build_meta_block(name, description, license_text) + body
        if not new_text.endswith("\n"):
            new_text += "\n"
        path.write_text(new_text, encoding="utf-8")
        return True

    # case 2: already info block but bullet style
    stripped = text.lstrip("\ufeff")
    if stripped.startswith('!!! info "문서 정보"'):
        top_lines, rest = _split_top_block(stripped)
        meta = _extract_meta_from_info_block(top_lines)
        name = meta["name"] or path.stem
        description = meta["description"] or "-"
        license_text = meta["license"] or "-"
        new_text = _build_meta_block(name, description, license_text) + rest
        if not new_text.endswith("\n"):
            new_text += "\n"
        path.write_text(new_text, encoding="utf-8")
        return True

    return False


def main() -> None:
    changed = 0
    for md in sorted(DOCS_ROOT.glob("*.md")):
        if normalize_file(md):
            changed += 1
    print(f"changed={changed}")


if __name__ == "__main__":
    main()
