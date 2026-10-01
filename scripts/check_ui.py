"""Check translated navigation, responsive layouts and the self-contained preview."""
import json, os, re, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
output = root / 'ui-checks'
output.mkdir(exist_ok=True)
errors = []
results = []
forbidden = re.compile(r'reçet|restaurant os|toggle sidebar|\b(?:completed|pending|reversed|sale_reversal|expense_reversal|ai_connection|ai_test)\b', re.I)

def check_page(page, view, width):
    expect(page.locator('.page-heading h1')).to_be_visible()
    text = page.locator('body').inner_text()
    assert not forbidden.search(text), (view, width, forbidden.search(text).group() if forbidden.search(text) else '')
    dimensions = page.evaluate('({page: document.documentElement.scrollWidth, viewport: innerWidth})')
    assert dimensions['page'] <= dimensions['viewport'] + 2, (view, width, dimensions)
    if view == 'dashboard':
        page.wait_for_function("document.querySelector('.restaurant-photo')?.naturalWidth > 0")
    results.append({'view': view, 'width': width, 'page_width': dimensions['page']})

with tempfile.TemporaryDirectory() as data:
    env = dict(os.environ, MISE_DATA_DIR=data, MISE_ALLOWED_ORIGINS='http://127.0.0.1:8937')
    log = (output / 'server.log').open('w', encoding='utf-8')
    server = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8937'], cwd=root, env=env, stdout=log, stderr=log)
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen('http://127.0.0.1:8937/api/health', timeout=1)
                break
            except Exception:
                if server.poll() is not None:
                    raise RuntimeError('Test server exited')
                time.sleep(.1)
        else:
            raise RuntimeError('Test server did not start')
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(locale='tr-TR', reduced_motion='reduce')
            page.on('pageerror', lambda error: errors.append(str(error)))
            for width in [1440, 1024, 768, 390, 360]:
                page.set_viewport_size({'width': width, 'height': 960})
                for view in ['dashboard', 'products', 'sales', 'inventory', 'accounts', 'reports', 'settings']:
                    page.goto('http://127.0.0.1:8937/?view=' + view)
                    check_page(page, view, width)
                    if width in [1440, 390] and view in ['dashboard', 'products', 'sales']:
                        page.screenshot(path=str(output / f'{view}-{width}.jpg'), full_page=True, type='jpeg', quality=85)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto('http://127.0.0.1:8937/')
            page.get_by_role('button', name='Menüyü aç veya kapat', exact=True).click()
            page.get_by_role('button', name='Ürünler ve tarifler', exact=True).click()
            expect(page.locator('.page-heading h1')).to_contain_text('Ürünler ve tarifler')
            expect(page.get_by_role('dialog')).not_to_be_visible()

            # Real registration and translated role display; data exists only in the temporary DB.
            registration = page.request.post('http://127.0.0.1:8937/api/auth/register', data={
                'name': 'Kontrol kullanıcısı', 'company': 'Kontrol işletmesi',
                'email': 'ui@example.test', 'password': 'UiExamplePass123!',
            })
            assert registration.ok, registration.text()
            page.goto('http://127.0.0.1:8937/?view=settings')
            page.get_by_role('button', name='Menüyü aç veya kapat', exact=True).click()
            expect(page.locator('.profile small')).to_have_text('İşletme sahibi')
            page.get_by_role('button', name='Ayarlar ve yetkiler', exact=True).click()
            page.get_by_role('tab', name='Kullanıcı ve yetkiler', exact=True).click()
            expect(page.get_by_role('cell', name='İşletme sahibi', exact=True)).to_be_visible()

            # AI settings stay responsive and never return or persist entered credentials.
            for width in [1440, 1024, 768, 390, 360]:
                page.set_viewport_size({'width': width, 'height': 960})
                page.goto('http://127.0.0.1:8937/?view=settings&tab=ai')
                expect(page.get_by_role('heading', name='Yapay zekâ bağlantısı', exact=True)).to_be_visible()
                expect(page.get_by_label('API anahtarı', exact=True)).to_be_enabled()
                check_page(page, 'settings-ai', width)
                if width in [1440, 390]:
                    page.screenshot(path=str(output / f'settings-ai-{width}.jpg'), full_page=True, type='jpeg', quality=85)
            ai_key = 'sk-ui-test-not-a-real-api-key-123456789'
            page.get_by_label('Sağlayıcı', exact=True).select_option('openai')
            page.get_by_label('Model kimliği', exact=True).fill('gpt-4.1-mini')
            page.get_by_label('API anahtarı', exact=True).fill(ai_key)
            page.get_by_role('button', name='Bağlantıyı kaydet', exact=True).click()
            expect(page.locator('.ai-feedback')).to_contain_text('Bağlantı kaydedildi')
            expect(page.get_by_label('API anahtarı', exact=True)).to_have_value('')
            expect(page.get_by_role('button', name='Bağlantıyı test et', exact=True)).to_be_enabled()
            status = page.request.get('http://127.0.0.1:8937/api/ai-connection')
            assert status.ok and ai_key not in status.text(), status.text()
            storage = page.evaluate('JSON.stringify({local: {...localStorage}, session: {...sessionStorage}})')
            assert ai_key not in storage, 'Credentials must not be stored in browser storage'
            page.get_by_label('Model kimliği', exact=True).fill('gpt-4.1')
            expect(page.get_by_role('button', name='Bağlantıyı test et', exact=True)).to_be_disabled()
            page.get_by_role('button', name='Bağlantıyı kaydet', exact=True).click()
            expect(page.locator('.ai-feedback')).to_contain_text('Bağlantı kaydedildi')
            assert page.request.get('http://127.0.0.1:8937/api/ai-connection').json()['connection']['model'] == 'gpt-4.1'
            page.get_by_role('button', name='Bağlantıyı kaldır', exact=True).click()
            page.get_by_role('button', name='Evet, kaldır', exact=True).click()
            expect(page.locator('.ai-feedback')).to_contain_text('Bağlantı kaldırıldı')
            assert page.request.get('http://127.0.0.1:8937/api/ai-connection').json()['connection'] is None
            page.goto('http://127.0.0.1:8937/?view=settings')
            page.get_by_role('tab', name='İşlem geçmişi', exact=True).click()
            expect(page.get_by_role('cell', name='Yapay zekâ bağlantısı', exact=True).first).to_be_visible()
            check_page(page, 'settings-ai-audit', 360)

            # Authenticated Excel download must keep ISO dates in API requests.
            page.goto('http://127.0.0.1:8937/?view=reports')
            with page.expect_response(lambda response: '/api/export?' in response.url) as report_response:
                page.get_by_role('button', name='Excel .xlsx', exact=True).first.click()
            response = report_response.value
            assert response.status == 200, f'Excel download failed: HTTP {response.status}, {response.url}'
            exported = page.request.get(response.url)
            assert exported.ok, exported.text()
            assert exported.headers['content-type'].startswith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            assert exported.body().startswith(b'PK'), 'Excel export must be an XLSX archive'

            offline_requests = []
            offline = browser.new_page(locale='tr-TR', viewport={'width': 1440, 'height': 960}, reduced_motion='reduce')
            offline.on('pageerror', lambda error: errors.append(str(error)))
            offline.on('request', lambda request: offline_requests.append(request.url) if '/api/' in request.url else None)
            offline.goto((root / 'Onizleme.html').as_uri())
            check_page(offline, 'dashboard', 1440)
            assert offline.locator('.restaurant-photo').get_attribute('src').startswith('data:image/'), 'Preview image must be self-contained'
            offline.get_by_role('button', name='Ürünleri incele', exact=True).click()
            expect(offline.locator('.page-heading h1')).to_contain_text('Ürünler ve tarifler')
            offline.get_by_role('button', name='Tarife malzeme ekle', exact=True).click()
            expect(offline.get_by_role('dialog')).to_be_visible()
            expect(offline.get_by_role('button', name='Kapat', exact=True)).to_be_visible()
            offline.get_by_role('button', name='Kapat', exact=True).click()
            offline.get_by_role('button', name='Ayarlar ve yetkiler', exact=True).click()
            offline.get_by_role('tab', name='Yapay zekâ', exact=True).click()
            expect(offline.get_by_role('heading', name='Yapay zekâ bağlantısı', exact=True)).to_be_visible()
            expect(offline.get_by_label('API anahtarı', exact=True)).to_be_disabled()
            expect(offline.get_by_role('button', name='Bağlantıyı kaydet', exact=True)).to_be_disabled()
            expect(offline.get_by_role('button', name='Bağlantıyı test et', exact=True)).to_be_disabled()
            offline.get_by_label('Sağlayıcı', exact=True).select_option('gemini')
            expect(offline.get_by_label('Model kimliği', exact=True)).to_have_value('gemini-2.5-flash')
            for width in [1440, 1024, 768, 390, 360]:
                offline.set_viewport_size({'width': width, 'height': 960})
                check_page(offline, 'offline-settings-ai', width)
            assert not offline_requests, offline_requests
            assert not errors, errors
            browser.close()
        (output / 'results.json').write_text(json.dumps({'layouts': results, 'page_errors': errors, 'offline_api_requests': offline_requests}, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'UI checks passed: {len(results)} layouts, mobile navigation, translated role, offline image and form.')
    finally:
        server.terminate()
        server.wait(timeout=10)
        log.close()
