# RestoPusula

Restoran zincirleri için Türkçe, web tabanlı bir yönetim paneli. React + TypeScript arayüzü, FastAPI API'si ve kalıcı SQLite veritabanı içerir. Bu depo, yerelde çalıştırılabilen ilk sürümdür; ticari üretim yayını yapılmış değildir.

## Ön izleme

**Onizleme.html** dosyasını indirip çift tıklayın. Gerçek uygulamanın derlenmiş arayüzü, sunucu ve kurulum gerektirmeden açılır. Modülleri, formları, bildirim panelini ve rapor ekranlarını inceleyebilirsiniz. Bu dosya görsel ön izlemedir; hesap, finansal kayıt ve dosya yükleme işlemleri için aşağıdaki çalışan uygulamayı başlatın.

Başlangıçta işletme verisi bulunmaz. Göstergeler `—` gösterir; örnek ciro, sahte bakiye veya tahmini kâr eklenmez.

## GitHub üzerinden paylaşılacak ön izleme

**Canlı ön izleme:** [RestoPusula panelini aç](https://bozkirabdullah53-arch.github.io/restopusula-onizleme/)

[Yayın deposu](https://github.com/bozkirabdullah53-arch/restopusula-onizleme), yalnızca derlenmiş `index.html` arayüzünü ve `.nojekyll` dosyasını içerir. Ana uygulama deposu gizlidir. Ön izleme gerçek arayüzdür; modüller gezilebilir, kayıt, hesap oluşturma ve ödeme işlemleri kapalıdır. Veritabanı veya gerçek işletme verisi yayın dosyalarına eklenmez.

GitHub Pages, `restopusula-onizleme` deposunda **Deploy from a branch → main → / (root)** kaynağından yayınlanır. İlk yayın başarıyla tamamlandı.

Arayüz değişikliklerinden sonra `frontend` içinde `npm run build`, proje kökünde `python scripts/make_preview.py` çalıştırın. Oluşan `docs/index.html` ve `docs/.nojekyll` dosyalarını ön izleme deposunun kökünde güncelleyin. Ön izleme deposuna kaydedilen değişiklikler Pages tarafından yeniden yayınlanır.

## Windows'ta kurulum

Python **3.11 veya üzeri** (Python Launcher dahil) ve Node.js **22.13 veya üzeri** gerekir. İlk kurulum paket indirmek için internet kullanır.

1. GitHub'da **Code → Download ZIP** ile indirin ve arşivi açın. Proje içindeki dosyaları `C:\Users\Abdullah\OneDrive\Desktop\Restoran zincirleri yönetim sistemi` klasörüne yerleştirin.
2. **Kurulum.cmd** dosyasını çift tıklayın. Python ortamını oluşturur, bağımlılıkları kurar ve arayüzü derler.
3. **Baslat.cmd** dosyasını çift tıklayın. Panel `http://127.0.0.1:8000` adresinde açılır.
4. **İşletmeyi kur** ile ilk işletme sahibini oluşturun. Şube → tahsilat hesabı → malzeme → ürün → ürün tarifi sırasıyla kayıtlarınızı ekleyin.

Sunucu penceresi açık kaldığı sürece uygulama çalışır. Kapatmak için sunucu penceresinde **Ctrl+C** kullanın. Yerel bağlantı varsayılan olarak yalnızca aynı bilgisayara açıktır. Windows komut dosyaları bu geliştirme ortamında çalıştırılamadı; Python ve arayüz derlemesi Linux ortamında doğrulandı.

## Bu sürümde çalışan akışlar

- İşletme hesabı, giriş/çıkış, zorunlu geçici şifre değişimi; rol, modül ve şube yetkilendirmesi.
- Şube ve tarih filtreli yönetici paneli; kayıtlı satış, gider, stok ve ödeme uyarıları.
- Masa kartları, açık adisyon taslağı, satış kaydı, indirim, birden fazla hesapla tahsilat; satış iadesi için gerekçeli ters kayıt.
- Ürünler, ürün tarifleri, malzemeler; stok giriş/çıkış, sayım, fire ve iki taraflı şube transferi.
- Satışla birlikte tarife bağlı stok düşümü ve tahsilat hareketi; yetersiz stokta işlemin bütünüyle reddi.
- Kasa/banka/POS hesapları, açılış bakiyesi ve değiştirilemeyen hesap hareketleri.
- İşletme gideri, alış faturası ve manuel mali yükümlülük; vade takibi, ödeme ve ters kayıt. Fatura tahakkuku ile ödemesi ayrı tutulur.
- Tedarikçiler ve satın alma aşamaları; teslim alma stok hareketi, fatura ve ödeme bağlantısı.
- Personel kartları ve puantaj; basit bütçe, araç, yakıt ve enerji kayıtları.
- PDF/PNG/JPEG belge yükleme; dört Excel `.xlsx` raporu ve tarayıcı üzerinden PDF/yazdırma ekranları.
- İşlem geçmişi, işletme bazında JSON dışa aktarım ve yerel veritabanı/belge yedeği.
- Kayıtlı verilerle çalışan kural tabanlı yönetim asistanı; eksik veride hesaplama yapılmaz.
- Ayarlar → Yapay zekâ bölümünde OpenAI, Gemini veya Claude bağlantısı ekleme, model erişimini test etme ve bağlantıyı kaldırma. Yalnızca Patron yönetebilir; API anahtarı sunucuda şifreli tutulur.

## Kapsam ve hesaplama

Bu ilk sürüm, tüm ayrıntılı ticari gereksinimlerin tamamlandığı anlamına gelmez. POS cihazı, banka, online sipariş, e-fatura/e-arşiv ve OCR servisleri **bağlı değildir**. Yapay zekâ ayarları sağlayıcı anahtarını kaydeder ve seçilen modele erişimi test eder; yönetim asistanı kural tabanlı çalışır. Otomatik bordro/mevzuat hesabı, ayrıntılı muhasebe defteri, otomatik vergi beyanı ve yedekten geri yükleme arayüzü yoktur.

AI bağlantısı için Patron hesabıyla **Ayarlar → Yapay zekâ** bölümünü açın. Sağlayıcı ve model kimliğini seçip sağlayıcınızdan aldığınız API anahtarını kaydedin; ardından **Bağlantıyı test et** düğmesini kullanın. Test yalnızca model bilgisini sorgular; içerik üretmez ve işletme kayıtlarını göndermez. Anahtar boş bırakıldığında mevcut sağlayıcının anahtarı korunur; sağlayıcı değiştirildiğinde yeni anahtar gerekir. Ön izlemede anahtar girişi ve bağlantı işlemleri kapalıdır.

Kayıtlı işletme sonucu = KDV hariç kayıtlı satış − satış anındaki tarif maliyeti − KDV hariç işletme gideri. Ürün tarifi veya maliyet eksikse sonuç hesaplanmaz. Tedarikçi alış faturası, tarif maliyetiyle aynı gideri ikinci kez saymamak için işletme giderine eklenmez. Bu gösterge kayıt dışındaki giderleri ve vergi sonrası muhasebe kârını kapsamaz. Stok maliyeti malzeme bazında ağırlıklı ortalamadır; şube bazında ayrı maliyet katmanları bulunmaz. Puantaj saatleri manuel kayıtlardır, yasal bordro hesabı değildir.

Çok işletmeli ve çok şubeli kayıt ayrımı uygulanır; **100 şube kapasitesi için yük testi yapılmadı**. SQLite tek sunuculu yerel kullanım için başlangıç altyapısıdır. Ticari SaaS yayını için PostgreSQL'e geçiş, HTTPS, dağıtık oturum/rate limit, bağımsız güvenlik ve yük testi, yedek geri dönüş denemesi ve ilgili servis entegrasyonları ayrıca tamamlanmalıdır. API `MISE_SECURE_COOKIE=1` ile HTTPS üzerinde güvenli çerez kullanabilir. Canlı veritabanını eşzamanlı OneDrive senkronizasyonuyla birden fazla bilgisayardan kullanmayın; tek sunucuda çalıştırıp yedek arşivini senkronize edin.

## Veri ve yedek

Yerel veri `backend/data` altında tutulur ve Git'e gönderilmez. **Yedekle.cmd**, `backend/data/backups` içine veritabanı ve belgeleri içeren ZIP yedeği oluşturur. Yönetici panelindeki JSON dışa aktarımı işletme kayıtlarını içerir; parola/oturum bilgilerini ve belge dosyalarını içermez. ZIP yedeğini geri almak için sunucuyu durdurun. Arşivdeki `restopusula.sqlite3` dosyasını **`mise.sqlite3` olarak yeniden adlandırıp** veri dizinindeki veritabanının yerine koyun; `documents` klasörünü de aynı veri dizinine yerleştirin. Tüm yerel ZIP yedeği, aynı sunucudaki işletmeleri kapsar; işletme sahibine gönderilecek dışa aktarım için paneldeki işletme bazlı JSON kullanılır.

AI anahtarları için veri dizininde `ai-secret.key` şifreleme dosyası oluşturulur. Bu dosya yerel yönetici ZIP yedeğine eklenir; geri yüklemede veritabanıyla birlikte aynı veri dizinine yerleştirin. Yerel ZIP, anahtarların çözülebilmesi için gereken şifreleme dosyasını da içerdiğinden özel tutulmalıdır. İşletme JSON dışa aktarımı AI anahtarlarını ve bu dosyayı içermez. Eksik veya bozuk şifreleme dosyası otomatik olarak değiştirilmez.

## Geliştirme

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
cd frontend
npm ci
npm run build
cd ..
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Canlı arayüz geliştirmek için ikinci terminalde `cd frontend && npm run dev` çalıştırın. `/api` istekleri 8000 portuna yönlendirilir.

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
python3 scripts/make_preview.py
```

Testler geçici veritabanlarıyla satış, stok, iade, ödeme, tekrar isteğin tek işleme dönüşmesi, işletme/şube erişimi ve Excel dosyası bütünlüğünü doğrular. Test verileri gerçek çalışma alanına eklenmez.

## Arayüz ve dil kontrolü

Menüler, ürün tarifleri, işlem başlıkları ve rapor durumları Türkçedir. Teknik işlem ve rol kodları veritabanında korunur; kullanıcıya gösterilen karşılıklar ayrı bir sunum katmanında çevrilir. Restoran görseli yerel WebP dosyasıdır; ön izleme oluşturulurken HTML içine gömülür.

GitHub kontrolleri arayüz derlemesini, işletme akışlarını ve 360, 390, 768, 1024 ve 1440 piksel genişlikte tarayıcı kontrollerini çalıştırır. `restopusula-preview` çıktısı güncel ön izlemeyi, ekran görüntülerini ve kontrol sonuçlarını içerir. Tarayıcı kontrolleri gerçek işletme verilerinden ayrı geçici bir veritabanı kullanır.

Yerelde tarayıcı kontrolü için:

```bash
python -m pip install playwright
python -m playwright install chromium
python scripts/make_preview.py
python scripts/check_ui.py
```
