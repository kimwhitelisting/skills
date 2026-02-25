from __future__ import annotations

import re
import textwrap
from pathlib import Path


DOCS_ROOT = Path(r"C:/dev/my-docs/docs")
FLAT_PREFIX = "team_share_ko__"
WRAP_WIDTH = 98


MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
NAME_BULLET_RE = re.compile(r"-\s+\*\*이름\*\*:\s+`([^`]+)`")
LIST_RE = re.compile(r"^(\s*(?:[-*+]|\d+\.)\s+)(.+)$")
TXT_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+\.txt)\)", re.IGNORECASE)
TOP_LIST_RE = re.compile(r"^(?:[-*+]|\d+\.)\s+")


def _to_virtual_path(flat_name: str) -> str:
    return flat_name[len(FLAT_PREFIX) :].replace("__", "/")


def _to_flat_name(virtual_path: str) -> str:
    return f"{FLAT_PREFIX}{virtual_path.replace('/', '__')}"


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _fallback_title_from_file(file_name: str) -> str:
    name = file_name
    if name.endswith(".md"):
        name = name[:-3]
    if name.startswith(FLAT_PREFIX):
        name = name[len(FLAT_PREFIX) :]
    parts = [part for part in name.split("__") if part]
    if not parts:
        return "문서"
    leaf = parts[-2] if parts[-1].upper() == "SKILL" and len(parts) >= 2 else parts[-1]
    return leaf.replace("-", " ").strip() or "문서"


def _replace_generic_h1(text: str, file_name: str) -> str:
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if not line.startswith("# "):
            continue
        title = line[2:].strip().strip('"').strip("'")
        lowered = title.lower()
        if title in {"문서", "SKILL"} or lowered in {"document", "skill"}:
            lines[i] = f"# {_fallback_title_from_file(file_name)}"
        break
    return "\n".join(lines)


def _extract_meta_title(text: str) -> str | None:
    m = NAME_BULLET_RE.search(text)
    if m:
        return m.group(1).strip()
    return None


def _ensure_single_h1(text: str, fallback_title: str | None) -> str:
    lines = text.splitlines()
    first_nonempty = next((ln for ln in lines if ln.strip()), "")
    first_h1_title = None
    for line in lines:
        if line.startswith("# "):
            first_h1_title = line[2:].strip()
            break

    if not first_nonempty.startswith("# "):
        title = fallback_title or first_h1_title or "문서"
        text = f"# {title}\n\n{text.lstrip()}"
        lines = text.splitlines()

    out: list[str] = []
    seen_h1 = False
    for line in lines:
        if line.startswith("# "):
            if not seen_h1:
                out.append(line)
                seen_h1 = True
            else:
                out.append("## " + line[2:])
        else:
            out.append(line)
    return "\n".join(out)


def _rewrite_markdown_links(text: str, file_name: str, existing: set[str]) -> str:
    if not file_name.startswith(FLAT_PREFIX):
        return text

    current_virtual = _to_virtual_path(file_name)
    current_dir = Path(current_virtual).parent

    def repl(match: re.Match[str]) -> str:
        label, target = match.group(1), match.group(2).strip()
        lower = target.lower()
        if (
            target.startswith("#")
            or "://" in target
            or lower.startswith("mailto:")
            or lower.startswith("javascript:")
        ):
            return match.group(0)

        base, frag = target, ""
        if "#" in target:
            base, frag = target.split("#", 1)
            frag = "#" + frag

        if base.startswith(FLAT_PREFIX):
            return match.group(0)

        if not base.lower().endswith(".md"):
            return match.group(0)

        resolved_virtual = str((current_dir / base).as_posix())
        parts: list[str] = []
        for part in resolved_virtual.split("/"):
            if part in {"", "."}:
                continue
            if part == "..":
                if parts:
                    parts.pop()
                continue
            parts.append(part)
        normalized_virtual = "/".join(parts)
        flat_target = _to_flat_name(normalized_virtual)
        if flat_target in existing:
            return f"[{label}]({flat_target}{frag})"
        return match.group(0)

    return MD_LINK_RE.sub(repl, text)


def _drop_txt_links(text: str) -> str:
    # LICENSE/TXT links are not part of docs_dir and trigger mkdocs warnings.
    return TXT_LINK_RE.sub(lambda m: f"`{m.group(1)}`", text)


def _compact_index_table(text: str, file_name: str) -> str:
    if file_name != "team_share_ko__INDEX.md":
        return text
    lines = text.splitlines()
    out: list[str] = []
    for line in lines:
        if line.startswith("|") and line.endswith("|") and line.count("|") >= 6:
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) >= 6 and cells[0] not in {"---", "번호"}:
                # Last column is description; keep short in summary table.
                desc = cells[-1]
                if len(desc) > 64:
                    cells[-1] = textwrap.shorten(desc, width=64, placeholder="…")
                line = "| " + " | ".join(cells) + " |"
        out.append(line)
    return "\n".join(out)


def _patch_known_anchor_issues(text: str, file_name: str) -> str:
    if file_name != "team_share_ko__skills__public__pptx__SKILL.md":
        return text
    fixed = text.replace(
        "## 이미지로 변환하기\n", "## 이미지로 변환하기 {#converting-to-images}\n"
    )
    return fixed


def _wrap_line(line: str, width: int) -> str:
    if len(line) <= width:
        return line

    stripped = line.lstrip()
    # skip tables/headers/blockquote/indented code/link definitions
    if (
        stripped.startswith("|")
        or stripped.startswith("#")
        or stripped.startswith(">")
        or line.startswith("    ")
        or stripped.startswith("[")
    ):
        return line

    m = LIST_RE.match(line)
    if m:
        prefix, body = m.group(1), m.group(2).strip()
        wrapped = textwrap.fill(
            body,
            width=max(20, width - len(prefix)),
            initial_indent=prefix,
            subsequent_indent=" " * len(prefix),
            break_long_words=False,
            break_on_hyphens=False,
        )
        return wrapped

    return textwrap.fill(
        line.strip(),
        width=width,
        break_long_words=False,
        break_on_hyphens=False,
    )


def _wrap_prose(text: str, width: int = WRAP_WIDTH) -> str:
    out: list[str] = []
    in_fence = False
    for line in text.splitlines():
        if line.strip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        out.append(_wrap_line(line, width))
    return "\n".join(out)


def _ensure_blank_line_before_top_lists(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    in_fence = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue

        is_top_list = bool(TOP_LIST_RE.match(line))
        if is_top_list and out:
            prev = out[-1]
            prev_stripped = prev.strip()
            if (
                prev_stripped
                and not TOP_LIST_RE.match(prev)
                and not prev_stripped.startswith("#")
                and not prev_stripped.startswith(">")
                and not prev_stripped.startswith("|")
                and prev != "---"
            ):
                out.append("")
        out.append(line)
    return "\n".join(out)


def main() -> None:
    files = sorted(DOCS_ROOT.glob("*.md"))
    existing = {p.name for p in files}
    changed = 0

    for path in files:
        raw = path.read_bytes()
        had_bom = raw.startswith(b"\xef\xbb\xbf")
        original = raw.decode("utf-8-sig", errors="replace")

        text = _normalize_newlines(original).lstrip("\ufeff")
        text = _replace_generic_h1(text, path.name)
        text = _ensure_single_h1(text, _extract_meta_title(text))
        text = _rewrite_markdown_links(text, path.name, existing)
        text = _drop_txt_links(text)
        text = _compact_index_table(text, path.name)
        text = _patch_known_anchor_issues(text, path.name)
        text = _wrap_prose(text, WRAP_WIDTH)
        text = _ensure_blank_line_before_top_lists(text)
        text = "\n".join(line.rstrip() for line in text.splitlines())
        if not text.endswith("\n"):
            text += "\n"

        if text != original or had_bom:
            path.write_text(text, encoding="utf-8")
            changed += 1

    print(f"normalized={changed}")


if __name__ == "__main__":
    main()
