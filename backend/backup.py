"""Local administrator backup: consistent SQLite snapshot plus document files."""
from pathlib import Path
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from app.database import connect, DATA_DIR

folder = DATA_DIR / 'backups'
folder.mkdir(parents=True, exist_ok=True)
dest = folder / ('restopusula-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.zip')
with tempfile.TemporaryDirectory() as tmp:
    snapshot = Path(tmp) / 'restopusula.sqlite3'
    with connect() as source, sqlite3.connect(snapshot) as target:
        source.backup(target)
        has_ai_table = target.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_connections'").fetchone()
        has_ai = has_ai_table and target.execute('SELECT tenant_id FROM ai_connections LIMIT 1').fetchone()
    ai_key = DATA_DIR / 'ai-secret.key'
    if has_ai and not ai_key.is_file():
        raise RuntimeError('AI şifreleme anahtarı bulunamadı; geri yüklenemeyen yedek oluşturulmadı.')
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(snapshot, 'restopusula.sqlite3')
        if ai_key.is_file():
            archive.write(ai_key, 'ai-secret.key')
        documents = DATA_DIR / 'documents'
        if documents.exists():
            for document in documents.iterdir():
                if document.is_file():
                    archive.write(document, 'documents/' + document.name)
print('Veritabanı ve belgeler yedeklendi:', dest)
