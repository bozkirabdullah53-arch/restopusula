import os, sqlite3, uuid
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR=Path(os.environ.get('MISE_DATA_DIR',Path(__file__).resolve().parents[1]/'data'))
DB_PATH=DATA_DIR/'mise.sqlite3'
def now(): return datetime.now(timezone.utc).isoformat()
def uid(): return str(uuid.uuid4())
def connect():
    DATA_DIR.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(DB_PATH,timeout=20)
    c.row_factory=sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    c.execute('PRAGMA busy_timeout=20000')
    return c
def init_db():
    with connect() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript(Path(__file__).with_name('schema.sql').read_text(encoding='utf-8'))
        c.execute('PRAGMA optimize')
def rows(c,sql,args=()): return [dict(r) for r in c.execute(sql,args).fetchall()]
def one(c,sql,args=()):
    r=c.execute(sql,args).fetchone()
    return dict(r) if r else None
def insert(c,table,values):
    # Identifiers come exclusively from the application's fixed table/field lists.
    names=list(values)
    c.execute(f"INSERT INTO {table} ({','.join(names)}) VALUES ({','.join('?' for _ in names)})",tuple(values.values()))
def audit(c,user,action,description,branch=None):
    insert(c,'audit_logs',dict(id=uid(),tenant_id=user['tenant_id'],user_id=user['id'],user_name=user['name'],branch_id=branch,action=action,description=description,created_at=now()))
