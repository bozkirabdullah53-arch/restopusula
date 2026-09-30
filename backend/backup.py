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
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(snapshot, 'restopusula.sqlite3')
        documents = DATA_DIR / 'documents'
        if documents.exists():
            for document in documents.iterdir():
                if document.is_file():
                    archive.write(document, 'documents/' + document.name)
print('Veritabanı ve belgeler yedeklendi:', dest)
