import json
import base64
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import uuid
import zipfile
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import database
from app.main import app
from app.security import _limits


class AIConnections(unittest.TestCase):
    key = 'sk-test-not-a-real-provider-key-123456789'
    payload = {'provider': 'openai', 'model': 'gpt-4.1-mini', 'api_key': key}

    def setUp(self):
        self.previous = database.DATA_DIR, database.DB_PATH
        self.temp = tempfile.TemporaryDirectory()
        database.DATA_DIR = Path(self.temp.name)
        database.DB_PATH = database.DATA_DIR / 'mise.sqlite3'
        _limits.clear()
        self.ctx = TestClient(app)
        self.client = self.ctx.__enter__()
        response = self.client.post('/api/auth/register', json={
            'name': 'AI test sahibi', 'company': 'AI test işletmesi',
            'email': 'ai-owner@example.test', 'password': 'ExamplePass123!',
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.csrf = response.json()['csrf']
        self.user_id = response.json()['user']['id']

    def tearDown(self):
        self.ctx.__exit__(None, None, None)
        database.DATA_DIR, database.DB_PATH = self.previous
        self.temp.cleanup()

    def post(self, path='/api/ai-connection', payload=None, client=None, csrf=None):
        return (client or self.client).post(path, json=payload or {}, headers={
            'X-CSRF-Token': csrf or self.csrf,
        })

    def save(self, **values):
        response = self.post(payload={**self.payload, **values})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['connection']

    def connection(self):
        response = self.client.get('/api/ai-connection')
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['connection']

    def test_encrypted_storage_and_secret_free_responses(self):
        self.assertIsNone(self.connection())
        saved = self.save()
        self.assertTrue(saved['has_key'])
        self.assertIsNone(saved['last_tested_at'])
        for response in [self.client.get('/api/ai-connection'),
                         self.client.get('/api/state'), self.client.get('/api/backup')]:
            self.assertEqual(response.status_code, 200, response.text)
            self.assertNotIn(self.key, response.text)
            self.assertNotIn('encrypted_api_key', response.text)
        with database.connect() as c:
            row = dict(c.execute('SELECT * FROM ai_connections').fetchone())
            self.assertNotEqual(row['encrypted_api_key'], self.key)
            self.assertNotIn(self.key, row['encrypted_api_key'])
        for path in database.DATA_DIR.glob('*'):
            if path.is_file():
                self.assertNotIn(self.key.encode(), path.read_bytes())
        if os.name != 'nt':
            self.assertEqual((database.DATA_DIR / 'ai-secret.key').stat().st_mode & 0o777, 0o600)

    def test_owner_csrf_and_password_change_boundaries(self):
        with TestClient(app) as anonymous:
            self.assertEqual(anonymous.get('/api/ai-connection').status_code, 401)
        for path in ['/api/ai-connection', '/api/ai-connection/test', '/api/ai-connection/remove']:
            self.assertEqual(self.client.post(path, json=self.payload).status_code, 403)
        self.assertEqual(self.client.post('/api/ai-connection', json=self.payload, headers={
            'X-CSRF-Token': self.csrf, 'Origin': 'https://outside.example.test',
        }).status_code, 403)
        with database.connect() as c:
            c.execute('UPDATE users SET role=?, permissions=? WHERE id=?',
                      ('Genel Müdür', json.dumps({'settings': {'view': True, 'edit': True}}), self.user_id))
        self.assertEqual(self.client.get('/api/ai-connection').status_code, 403)
        for path in ['/api/ai-connection', '/api/ai-connection/test', '/api/ai-connection/remove']:
            self.assertEqual(self.post(path, self.payload).status_code, 403)
        with database.connect() as c:
            c.execute('UPDATE users SET role=?, must_change=1 WHERE id=?', ('Patron', self.user_id))
        self.assertEqual(self.client.get('/api/ai-connection').status_code, 403)
        self.assertEqual(self.post(payload=self.payload).status_code, 403)

    def test_connections_are_tenant_scoped(self):
        self.save()
        with TestClient(app) as other:
            auth = other.post('/api/auth/register', json={
                'name': 'Other owner', 'company': 'Other tenant',
                'email': 'other-ai@example.test', 'password': 'OtherPass123!',
            }).json()
            self.assertIsNone(other.get('/api/ai-connection').json()['connection'])
            response = self.post(payload={'provider': 'gemini', 'model': 'gemini-2.5-flash',
                                         'api_key': 'other-test-key-123456', 'tenant_id': self.user_id},
                                 client=other, csrf=auth['csrf'])
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(self.connection()['provider'], 'openai')
            self.assertEqual(self.post('/api/ai-connection/remove', client=other,
                                      csrf=auth['csrf']).status_code, 200)
            self.assertEqual(self.connection()['provider'], 'openai')

    def test_blank_key_preserves_secret_but_provider_change_requires_new_key(self):
        self.save()
        with patch('httpx.Client.get', autospec=True, return_value=httpx.Response(200, json={'id': 'gpt-4.1-mini'})):
            self.assertEqual(self.post('/api/ai-connection/test').status_code, 200)
        old_test = self.connection()['last_tested_at']
        self.assertIsNotNone(old_test)
        self.assertEqual(self.save(api_key='')['last_tested_at'], old_test)
        self.assertIsNone(self.save(model='gpt-4.1', api_key='')['last_tested_at'])
        rejected = self.post(payload={'provider': 'gemini', 'model': 'gemini-2.5-flash', 'api_key': ''})
        self.assertEqual(rejected.status_code, 400, rejected.text)
        self.assertEqual(self.connection()['provider'], 'openai')

    def test_invalid_fields_never_create_or_call_a_provider(self):
        for values in [{'provider': 'custom'}, {'model': 'https://example.test/model'},
                       {'model': '../../secret'}, {'model': ''}, {'api_key': ''},
                       {'api_key': 'bad\r\nAuthorization: leaked'}, {'api_key': 123}]:
            response = self.post(payload={**self.payload, **values})
            self.assertEqual(response.status_code, 400, (values, response.text))
        self.assertIsNone(self.connection())
        self.assertFalse((database.DATA_DIR / 'ai-secret.key').exists())

    def test_invalid_request_shapes_do_not_echo_credentials(self):
        for body in [[{'api_key': self.key}], self.key, None]:
            response = self.client.post('/api/ai-connection', json=body,
                                        headers={'X-CSRF-Token': self.csrf})
            self.assertGreaterEqual(response.status_code, 400)
            self.assertNotIn(self.key, response.text)
        response = self.client.post('/api/ai-connection',
                                    content=json.dumps({'api_key': self.key}) + 'trailing',
                                    headers={'X-CSRF-Token': self.csrf, 'Content-Type': 'application/json'})
        self.assertGreaterEqual(response.status_code, 400)
        self.assertNotIn(self.key, response.text)

    def test_provider_tests_use_fixed_metadata_endpoints_and_auth_headers(self):
        cases = [
            ('openai', 'gpt-4.1-mini', 'https://api.openai.com/v1/models/gpt-4.1-mini',
             'Authorization', 'Bearer ' + self.key, {'id': 'gpt-4.1-mini'}),
            ('gemini', 'gemini-2.5-flash', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
             'x-goog-api-key', self.key, {'name': 'models/gemini-2.5-flash'}),
            ('anthropic', 'claude-haiku-4-5', 'https://api.anthropic.com/v1/models/claude-haiku-4-5',
             'x-api-key', self.key, {'id': 'claude-haiku-4-5-20251001'}),
        ]
        for provider, model, url, header, value, metadata in cases:
            self.save(provider=provider, model=model)
            with patch('httpx.Client.get', autospec=True, return_value=httpx.Response(200, json=metadata)) as get:
                response = self.post('/api/ai-connection/test')
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(get.call_args.args[1], url)
                self.assertEqual(get.call_args.kwargs['headers'][header], value)
                self.assertNotIn(self.key, url)
                self.assertNotIn('json', get.call_args.kwargs)
                if provider == 'anthropic':
                    self.assertEqual(get.call_args.kwargs['headers']['anthropic-version'], '2023-06-01')
            self.assertIsNotNone(self.connection()['last_tested_at'])
            self.assertNotIn(self.key, response.text)

    def test_provider_errors_clear_verified_status_and_hide_reflected_secrets(self):
        self.save()
        with patch('httpx.Client.get', autospec=True, return_value=httpx.Response(200, json={'id': 'gpt-4.1-mini'})):
            self.assertEqual(self.post('/api/ai-connection/test').status_code, 200)
        for status in [401, 403, 404, 429, 500, 302]:
            with patch('httpx.Client.get', autospec=True,
                       return_value=httpx.Response(status, json={'error': self.key})):
                response = self.post('/api/ai-connection/test')
            self.assertGreaterEqual(response.status_code, 400)
            self.assertNotIn(self.key, response.text)
            self.assertIsNone(self.connection()['last_tested_at'])

    def test_timeout_and_malformed_success_fail_safely(self):
        self.save()
        with patch('httpx.Client.get', autospec=True, side_effect=httpx.ReadTimeout(self.key)):
            response = self.post('/api/ai-connection/test')
        self.assertEqual(response.status_code, 504, response.text)
        self.assertNotIn(self.key, response.text)
        with patch('httpx.Client.get', autospec=True, return_value=httpx.Response(200, text=self.key)):
            response = self.post('/api/ai-connection/test')
        self.assertEqual(response.status_code, 502, response.text)
        self.assertNotIn(self.key, response.text)

    def test_concurrent_edit_cannot_certify_stale_credentials(self):
        self.save()
        def edit_during_test(*args, **kwargs):
            self.save(model='gpt-4.1', api_key='')
            return httpx.Response(200, json={'id': 'gpt-4.1-mini'})
        with patch('httpx.Client.get', autospec=True, side_effect=edit_during_test):
            response = self.post('/api/ai-connection/test')
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.connection()['model'], 'gpt-4.1')
        self.assertIsNone(self.connection()['last_tested_at'])

    def test_missing_or_corrupt_master_key_is_not_silently_replaced(self):
        self.save()
        key_path = database.DATA_DIR / 'ai-secret.key'
        key_path.unlink()
        self.assertEqual(self.post('/api/ai-connection/test').status_code, 503)
        self.assertEqual(self.post(payload=self.payload).status_code, 503)
        self.assertFalse(key_path.exists())
        key_path.write_bytes(b'corrupt')
        self.assertEqual(self.post('/api/ai-connection/test').status_code, 503)
        self.assertEqual(key_path.read_bytes(), b'corrupt')

    def test_remove_and_rate_limit(self):
        self.save()
        with patch('httpx.Client.get', autospec=True, return_value=httpx.Response(200, json={'id': 'gpt-4.1-mini'})) as get:
            for _ in range(10):
                self.assertEqual(self.post('/api/ai-connection/test').status_code, 200)
            self.assertEqual(self.post('/api/ai-connection/test').status_code, 429)
            self.assertEqual(get.call_count, 10)
        self.assertEqual(self.post('/api/ai-connection/remove').status_code, 200)
        self.assertIsNone(self.connection())
        self.assertEqual(self.post('/api/ai-connection/test').status_code, 404)

    def corrupt_master_key(self):
        path = database.DATA_DIR / 'ai-secret.key'
        decoded = bytearray(base64.urlsafe_b64decode(path.read_bytes()))
        decoded[0] ^= 1
        path.write_bytes(base64.urlsafe_b64encode(decoded))

    def test_valid_format_wrong_master_key_cannot_overwrite_connection(self):
        self.save()
        with database.connect() as c:
            previous = c.execute('SELECT encrypted_api_key FROM ai_connections').fetchone()[0]
        self.corrupt_master_key()
        response = self.post(payload={**self.payload, 'api_key': 'new-test-key-123456789'})
        self.assertEqual(response.status_code, 503, response.text)
        with database.connect() as c:
            self.assertEqual(c.execute('SELECT encrypted_api_key FROM ai_connections').fetchone()[0], previous)

    def test_new_tenant_cannot_save_using_mismatched_master_key(self):
        self.save()
        self.corrupt_master_key()
        with TestClient(app) as other:
            auth = other.post('/api/auth/register', json={
                'name': 'Other owner', 'company': 'Other tenant',
                'email': 'new-tenant-ai@example.test', 'password': 'OtherPass123!',
            }).json()
            response = self.post(payload=self.payload, client=other, csrf=auth['csrf'])
            self.assertEqual(response.status_code, 503, response.text)
            self.assertIsNone(other.get('/api/ai-connection').json()['connection'])

    def test_backup_rejects_corrupt_or_mismatched_encryption_keys(self):
        self.save()
        root = Path(__file__).resolve().parents[2]
        path = database.DATA_DIR / 'ai-secret.key'
        original = path.read_bytes()
        for valid_format in [False, True]:
            with self.subTest(valid_format=valid_format):
                path.write_bytes(original)
                if valid_format:
                    self.corrupt_master_key()
                else:
                    path.write_bytes(b'corrupt')
                result = subprocess.run([sys.executable, 'backend/backup.py'], cwd=root,
                                        env={**os.environ, 'MISE_DATA_DIR': str(database.DATA_DIR)},
                                        capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(list((database.DATA_DIR / 'backups').glob('*.zip')), [])

    def test_local_backup_can_restore_encrypted_connection(self):
        self.save()
        root = Path(__file__).resolve().parents[2]
        subprocess.run([sys.executable, 'backend/backup.py'], cwd=root,
                       env={**os.environ, 'MISE_DATA_DIR': str(database.DATA_DIR)},
                       check=True, capture_output=True, text=True)
        archive_path = next((database.DATA_DIR / 'backups').glob('*.zip'))
        with tempfile.TemporaryDirectory() as restored, zipfile.ZipFile(archive_path) as archive:
            self.assertIn('ai-secret.key', archive.namelist())
            archive.extractall(restored)
            restore_path = Path(restored)
            (restore_path / 'restopusula.sqlite3').rename(restore_path / 'mise.sqlite3')
            original = database.DATA_DIR, database.DB_PATH
            try:
                database.DATA_DIR, database.DB_PATH = restore_path, restore_path / 'mise.sqlite3'
                with TestClient(app) as client:
                    auth = client.post('/api/auth/login', json={'email': 'ai-owner@example.test',
                                                              'password': 'ExamplePass123!'}).json()
                    with patch('httpx.Client.get', autospec=True,
                               return_value=httpx.Response(200, json={'id': 'gpt-4.1-mini'})) as get:
                        response = self.post('/api/ai-connection/test', client=client, csrf=auth['csrf'])
                        self.assertEqual(response.status_code, 200, response.text)
                        self.assertEqual(get.call_args.kwargs['headers']['Authorization'], 'Bearer ' + self.key)
            finally:
                database.DATA_DIR, database.DB_PATH = original
