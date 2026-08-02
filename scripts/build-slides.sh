#!/usr/bin/env bash
# Compiles docs/presentation.md into a single self-contained HTML slideshow
# (docs/presentation.html) via Marp CLI, then inlines the `![bg ...](../img/...)`
# background images as base64 so the result has no external file dependencies
# and can be opened directly or shared as-is.
set -euo pipefail

cd "$(dirname "$0")/.."

SRC=docs/presentation.md
OUT=docs/presentation.html

mise exec -- npx -y @marp-team/marp-cli "$SRC" -o "$OUT" --html --allow-local-files

python3 - "$OUT" <<'PY'
import base64
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
html = path.read_text(encoding="utf-8")


def embed(match: re.Match) -> str:
    rel = match.group(1)
    img_path = pathlib.Path("img") / rel.split("../img/")[1]
    data = base64.b64encode(img_path.read_bytes()).decode()
    return f'background-image:url(&quot;data:image/png;base64,{data}&quot;)'


html = re.sub(r'background-image:url\(&quot;(\.\./img/[^&]*)&quot;\)', embed, html)
path.write_text(html, encoding="utf-8")
PY

echo "Wrote $OUT"
