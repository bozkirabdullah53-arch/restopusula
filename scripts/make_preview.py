"""Package the compiled application as an offline, read-only visual preview."""
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / "frontend" / "dist"
page = (dist / "index.html").read_text(encoding="utf-8")
page = re.sub(r'<link rel="icon"[^>]*>', '', page)
def css(match):
    asset = dist / match.group(1).lstrip('/')
    return '<style>' + asset.read_text(encoding="utf-8") + '</style>'
def js(match):
    asset = dist / match.group(1).lstrip('/')
    script = asset.read_text(encoding="utf-8").replace('</script', '<\\/script')
    return '<script>window.__RESTOPUSULA_PREVIEW__=true;</script><script type="module">' + script + '</script>'
page = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css, page)
page = re.sub(r'<script[^>]*src="([^"]+)"[^>]*></script>', js, page)
page = page.replace('<title>', '<title>Ön izleme · ')
target = root / "Onizleme.html"
target.write_text(page, encoding="utf-8")
print('Ön izleme hazır:', target)
