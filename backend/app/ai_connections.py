"""Owner-managed provider credentials; never include secrets in business state."""
import json
import os
import re
import threading
from typing import Any

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Body, HTTPException, Request

from . import database
from .database import audit, connect, now, one, rows, uid
from .security import authenticate, rate_limit, require_permission

router = APIRouter(prefix='/api/ai-connection')
PROVIDERS = {
    'openai': 'https://api.openai.com/v1/models/',
    'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/',
    'anthropic': 'https://api.anthropic.com/v1/models/',
}
_key_lock = threading.Lock()


def owner(c, request, mutation=False):
    user = authenticate(c, request, mutation)
    require_permission(user, 'settings', 'edit' if mutation else 'view')
    if user['role'] != 'Patron':
        raise HTTPException(403, 'Yapay zekâ bağlantısını yalnızca işletme sahibi yönetebilir.')
    return user


def stored(c, tenant_id):
    return one(c, 'SELECT * FROM ai_connections WHERE tenant_id=?', (tenant_id,))


def public(connection):
    if not connection:
        return None
    return {k: connection[k] for k in ['provider', 'model', 'last_tested_at', 'updated_at']} | {'has_key': True}


def cipher(c, create=False):
    path = database.DATA_DIR / 'ai-secret.key'
    try:
        with _key_lock:
            if create and not path.exists():
                # A lost master key must never silently invalidate existing businesses.
                if one(c, 'SELECT tenant_id FROM ai_connections LIMIT 1'):
                    raise HTTPException(503, 'Şifreleme anahtarı bulunamadı. Sunucu yedeğini geri yükleyin.')
                try:
                    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                except FileExistsError:
                    pass
                else:
                    with os.fdopen(fd, 'wb') as handle:
                        handle.write(Fernet.generate_key())
                        handle.flush()
                        os.fsync(handle.fileno())
            encryption = Fernet(path.read_bytes())
            if create:
                validate_master_key(c, encryption)
            return encryption
    except (OSError, ValueError):
        raise HTTPException(503, 'Şifreleme anahtarı okunamadı. Sunucu yedeğini kontrol edin.') from None


def decode_secret(encryption, connection):
    try:
        payload = json.loads(encryption.decrypt(connection['encrypted_api_key'].encode()))
        if payload['tenant_id'] != connection['tenant_id'] or not isinstance(payload['api_key'], str) or not payload['api_key']:
            raise ValueError('Tenant mismatch')
        return payload['api_key']
    except (InvalidToken, ValueError, KeyError, TypeError):
        raise HTTPException(503, 'Kayıtlı anahtar çözülemedi. Sunucu yedeğini kontrol edin.') from None


def validate_master_key(c, encryption):
    # A correctly encoded Fernet key can still be the wrong key. Authenticate
    # it against stored credentials before allowing any replacement or backup.
    for connection in rows(c, 'SELECT * FROM ai_connections'):
        decode_secret(encryption, connection)


def decrypt(c, connection):
    return decode_secret(cipher(c), connection)


def fields(payload):
    provider = payload.get('provider')
    model = payload.get('model')
    key = payload.get('api_key', '')
    if not isinstance(provider, str) or provider not in PROVIDERS:
        raise HTTPException(400, 'OpenAI, Gemini veya Claude sağlayıcısını seçin.')
    if not isinstance(model, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{0,127}', model.strip()):
        raise HTTPException(400, 'Geçerli bir model kimliği girin; URL veya models/ öneki kullanmayın.')
    if not isinstance(key, str):
        raise HTTPException(400, 'API anahtarı metin olmalı.')
    key = key.strip()
    if key and (not 8 <= len(key) <= 2048 or any(ord(ch) < 33 or ord(ch) > 126 for ch in key)):
        raise HTTPException(400, 'API anahtarı 8–2048 karakter olmalı ve boşluk içermemeli.')
    return provider, model.strip(), key


@router.get('')
def get_connection(request: Request):
    with connect() as c:
        user = owner(c, request)
        return {'connection': public(stored(c, user['tenant_id']))}


@router.post('')
def save_connection(request: Request, payload: Any = Body(None)):
    with connect() as c:
        c.execute('BEGIN IMMEDIATE')
        user = owner(c, request, True)
        if not isinstance(payload, dict):
            raise HTTPException(400, 'Bağlantı bilgilerini geçerli bir JSON nesnesi olarak gönderin.')
        provider, model, key = fields(payload)
        old = stored(c, user['tenant_id'])
        if not key and (not old or old['provider'] != provider):
            raise HTTPException(400, 'Yeni bağlantı veya sağlayıcı değişikliği için API anahtarı girin.')
        changed = not old or old['provider'] != provider or old['model'] != model or bool(key)
        if key:
            secret = json.dumps({'tenant_id': user['tenant_id'], 'api_key': key}).encode()
            encrypted = cipher(c, create=True).encrypt(secret).decode()
        else:
            decrypt(c, old)
            encrypted = old['encrypted_api_key']
        if changed:
            c.execute('''INSERT INTO ai_connections
                         (tenant_id,provider,model,encrypted_api_key,revision,last_tested_at,updated_at)
                         VALUES (?,?,?,?,?,NULL,?) ON CONFLICT(tenant_id) DO UPDATE SET
                         provider=excluded.provider,model=excluded.model,
                         encrypted_api_key=excluded.encrypted_api_key,revision=excluded.revision,
                         last_tested_at=NULL,updated_at=excluded.updated_at''',
                      (user['tenant_id'], provider, model, encrypted, uid(), now()))
            audit(c, user, 'ai_connection', 'Yapay zekâ bağlantısı kaydedildi')
        return {'connection': public(stored(c, user['tenant_id'])), 'message': 'Bağlantı kaydedildi.'}


def probe_model(connection, key):
    provider = connection['provider']
    headers = {'Accept': 'application/json'}
    if provider == 'openai':
        headers['Authorization'] = 'Bearer ' + key
    elif provider == 'gemini':
        headers['x-goog-api-key'] = key
    else:
        headers.update({'x-api-key': key, 'anthropic-version': '2023-06-01'})
    try:
        with httpx.Client(timeout=10.0, follow_redirects=False, trust_env=False) as client:
            response = client.get(PROVIDERS[provider] + connection['model'], headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(504, 'Sağlayıcı zamanında yanıt vermedi. Yeniden deneyin.') from None
    except httpx.RequestError:
        raise HTTPException(502, 'Sağlayıcıya ulaşılamadı. İnternet bağlantısını kontrol edin.') from None
    # Never return provider bodies; they can reflect an API key or arbitrary text.
    if response.status_code in (401, 403):
        raise HTTPException(400, 'Sağlayıcı erişimi reddetti. API anahtarını ve model izinlerini kontrol edin.')
    if response.status_code == 404:
        raise HTTPException(400, 'Model bulunamadı. Sağlayıcının model kimliğini kontrol edin.')
    if response.status_code == 429:
        raise HTTPException(429, 'Sağlayıcının istek sınırına ulaşıldı. Bir süre sonra yeniden deneyin.')
    if response.status_code != 200:
        raise HTTPException(502, 'Sağlayıcı bağlantıyı doğrulayamadı. Daha sonra yeniden deneyin.')
    try:
        metadata = response.json()
        name = metadata.get('name' if provider == 'gemini' else 'id')
        if not isinstance(name, str) or not name:
            raise ValueError('Missing model')
    except (ValueError, AttributeError):
        raise HTTPException(502, 'Sağlayıcıdan geçerli model bilgisi alınamadı.') from None


@router.post('/test')
def test_connection(request: Request):
    with connect() as c:
        user = owner(c, request, True)
        connection = stored(c, user['tenant_id'])
        if not connection:
            raise HTTPException(404, 'Önce bir yapay zekâ bağlantısı kaydedin.')
        rate_limit('ai-test:' + user['tenant_id'], 10, 900)
        failure = None
        try:
            key = decrypt(c, connection)
        except HTTPException as error:
            failure = error
    # Network I/O must not hold a SQLite transaction or block other business writes.
    if failure is None:
        try:
            probe_model(connection, key)
        except HTTPException as error:
            failure = error
    with connect() as c:
        c.execute('BEGIN IMMEDIATE')
        owner(c, request, True)
        result = c.execute('''UPDATE ai_connections SET last_tested_at=?
                              WHERE tenant_id=? AND revision=?''',
                           (None if failure else now(), user['tenant_id'], connection['revision']))
        if result.rowcount != 1:
            raise HTTPException(409, 'Bağlantı test sırasında değişti. Güncel bağlantıyı yeniden test edin.')
        audit(c, user, 'ai_test', 'Yapay zekâ bağlantısı kontrol edildi' if not failure else 'Yapay zekâ bağlantı testi başarısız')
        current = public(stored(c, user['tenant_id']))
    if failure:
        raise failure
    return {'connection': current, 'message': 'Model erişimi doğrulandı. İçerik üretilmedi.'}


@router.post('/remove')
def remove_connection(request: Request):
    with connect() as c:
        c.execute('BEGIN IMMEDIATE')
        user = owner(c, request, True)
        c.execute('DELETE FROM ai_connections WHERE tenant_id=?', (user['tenant_id'],))
        audit(c, user, 'ai_connection', 'Yapay zekâ bağlantısı kaldırıldı')
    return {'connection': None, 'message': 'Bağlantı kaldırıldı.'}
