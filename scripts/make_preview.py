"""Package the compiled application as an offline, read-only visual preview."""
import re, base64, mimetypes
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
    for image in (dist / 'images').glob('*'):
        if image.is_file():
            mime = mimetypes.guess_type(image.name)[0] or 'application/octet-stream'
            encoded = base64.b64encode(image.read_bytes()).decode('ascii')
            script = script.replace('/images/' + image.name, 'data:' + mime + ';base64,' + encoded)
    return '<script>window.__RESTOPUSULA_PREVIEW__=true;</script><script type="module">' + script + '</script>'
page = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css, page)
page = re.sub(r'<script[^>]*src="([^"]+)"[^>]*></script>', js, page)
page = page.replace('<title>', '<title>Ön izleme · ')
target = root / "Onizleme.html"
target.write_text(page, encoding="utf-8")
print('Ön izleme hazır:', target)
