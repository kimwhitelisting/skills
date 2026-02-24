from __future__ import annotations

import shutil
from pathlib import Path


SRC_ROOT = Path(r"C:/dev/one_a_day/docs/skills/team_share_ko")
DST_ROOT = Path(r"C:/dev/my-docs/docs")
FLAT_PREFIX = "team_share_ko__"


def _run_script(path: Path) -> None:
    code = path.read_text(encoding="utf-8")
    namespace = {"__name__": "__main__"}
    exec(compile(code, str(path), "exec"), namespace, namespace)


def copy_flattened_docs() -> int:
    copied = 0
    for src in SRC_ROOT.rglob("*.md"):
        rel = src.relative_to(SRC_ROOT).as_posix()
        dst_name = FLAT_PREFIX + rel.replace("/", "__")
        dst = DST_ROOT / dst_name
        shutil.copyfile(src, dst)
        copied += 1
    return copied


def main() -> None:
    copied = copy_flattened_docs()
    print(f"copied={copied}")

    _run_script(Path(r"C:/dev/my-docs/scripts/reformat_skill_meta_for_readability.py"))
    _run_script(Path(r"C:/dev/my-docs/scripts/normalize_docs_all.py"))

    print("sync complete")


if __name__ == "__main__":
    main()
