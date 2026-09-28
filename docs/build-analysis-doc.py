#!/usr/bin/env python3
"""
Render FINAL_PROJECT_ANALYSIS.md into a shareable, self-contained HTML file
(and, via headless Chrome, a print-ready PDF).

Usage:
    pip install markdown pygments
    python3 docs/build-analysis-doc.py

Outputs FINAL_PROJECT_ANALYSIS.html and, when Google Chrome is installed,
FINAL_PROJECT_ANALYSIS.pdf rendered headlessly at A4. Re-run after editing the
Markdown source to refresh both.
"""

import html
import pathlib
import re
import subprocess
import sys

import markdown

DOCS = pathlib.Path(__file__).resolve().parent
SOURCE = DOCS / "FINAL_PROJECT_ANALYSIS.md"
HTML_OUT = DOCS / "FINAL_PROJECT_ANALYSIS.html"
PDF_OUT = DOCS / "FINAL_PROJECT_ANALYSIS.pdf"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@page { size: A4; margin: 16mm 14mm; }

:root {
  --ink: #16181d;
  --muted: #5b6472;
  --rule: #d8dee8;
  --accent: #2d4bd8;
  --code-bg: #f5f7fa;
  --th-bg: #eef2f9;
}

* { box-sizing: border-box; }

body {
  font-family: -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: var(--ink);
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 30px 60px;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

h1, h2, h3, h4 { line-height: 1.25; font-weight: 650; }

h1 {
  font-size: 23pt;
  margin: 0 0 6px;
  letter-spacing: -0.4px;
}

h2 {
  font-size: 15pt;
  margin: 30px 0 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--rule);
  page-break-after: avoid;
  break-after: avoid;
}

h3 {
  font-size: 12pt;
  margin: 20px 0 6px;
  color: #23262d;
  page-break-after: avoid;
  break-after: avoid;
}

p, ul, ol { margin: 0 0 10px; }
li { margin-bottom: 4px; }

a { color: var(--accent); text-decoration: none; }

hr {
  border: 0;
  border-top: 1px solid var(--rule);
  margin: 26px 0;
}

code, kbd {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 9pt;
  background: var(--code-bg);
  border: 1px solid #e3e8ef;
  border-radius: 3px;
  padding: 1px 4px;
  white-space: nowrap;
}

pre {
  background: var(--code-bg);
  border: 1px solid #e3e8ef;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  padding: 11px 13px;
  overflow-x: auto;
  page-break-inside: avoid;
  break-inside: avoid;
  margin: 0 0 14px;
}

pre code {
  background: none;
  border: 0;
  padding: 0;
  font-size: 8.4pt;
  line-height: 1.5;
  white-space: pre;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 16px;
  font-size: 9.4pt;
  page-break-inside: avoid;
  break-inside: avoid;
}

th, td {
  border: 1px solid var(--rule);
  padding: 6px 9px;
  text-align: left;
  vertical-align: top;
}

th { background: var(--th-bg); font-weight: 650; }
tbody tr:nth-child(even) { background: #fafbfd; }
td code, th code { white-space: normal; word-break: break-word; }

blockquote {
  margin: 0 0 14px;
  padding: 10px 14px;
  background: #f7f9fc;
  border-left: 3px solid var(--accent);
  color: #2c3340;
}

blockquote p { margin: 0; }

.doc-header {
  border-bottom: 3px solid var(--ink);
  padding-bottom: 14px;
  margin-bottom: 8px;
}

.doc-sub {
  color: var(--muted);
  font-size: 10pt;
  margin: 0;
}

/* The table of contents reads better as two columns in print. */
.toc-block ul { columns: 2; column-gap: 34px; }

@media print {
  body { padding: 0; max-width: none; }
  a { color: var(--ink); }
}
"""


def build_html() -> str:
    text = SOURCE.read_text(encoding="utf-8")

    # The first heading becomes the document header; drop it from the body so it
    # is not rendered twice.
    lines = text.split("\n")
    title = lines[0].lstrip("# ").strip() if lines and lines[0].startswith("# ") else "Project Analysis"
    body_md = "\n".join(lines[1:]).lstrip("\n")

    rendered = markdown.markdown(
        body_md,
        extensions=["tables", "fenced_code", "codehilite", "sane_lists", "attr_list"],
        extension_configs={
            "codehilite": {
                "noclasses": True,
                "pygments_style": "friendly",
                # Unlabelled fences hold ASCII diagrams and console output.
                # Guessing a language mangles them, so leave them plain.
                "guess_lang": False,
            }
        },
    )

    # Give the table-of-contents list its own class so print CSS can column it.
    rendered = rendered.replace(
        "<h2>Table of contents</h2>",
        '<h2>Table of contents</h2><div class="toc-block">',
        1,
    )
    rendered = rendered.replace("<hr />", "</div><hr />", 1)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>
<div class="doc-header">
  <h1>{html.escape(title)}</h1>
  <p class="doc-sub">Network-Based Attendance System &middot; Complete technical analysis</p>
</div>
{rendered}
</body>
</html>
"""


def main() -> int:
    if not SOURCE.exists():
        print(f"error: {SOURCE} not found", file=sys.stderr)
        return 1

    HTML_OUT.write_text(build_html(), encoding="utf-8")
    print(f"HTML written: {HTML_OUT.name} ({HTML_OUT.stat().st_size // 1024} KB)")

    if pathlib.Path(CHROME).exists():
        subprocess.run(
            [
                CHROME,
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={PDF_OUT}",
                HTML_OUT.as_uri(),
            ],
            check=True,
            capture_output=True,
            timeout=180,
        )
        print(f"PDF written:  {PDF_OUT.name} ({PDF_OUT.stat().st_size // 1024} KB)")
    else:
        print("Chrome not found; skipped PDF. Open the HTML and use Print to PDF.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
