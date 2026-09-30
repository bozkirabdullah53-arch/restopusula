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
4. **İşletmeyi kur** ile ilk işletme sahibini oluşturun. Şube → tahsilat hesabı → malzeme → ürün → reçete sırasıyla kayıtlarınızı ekleyin.

Sunucu penceresi açık kaldığı sürece uygulama çalışır. Kapatmak için sunucu penceresinde **Ctrl+C** kullanın. Yerel bağlantı varsayılan olarak yalnızca aynı bilgisayara açıktır. Windows komut dosyaları bu geliştirme ortamında çalıştırılamadı; Python ve arayüz derlemesi Linux ortamında doğrulandı.

## Bu sürümde çalışan akışlar

- İşletme hesabı, giriş/çıkış, zorunlu geçici şifre değişimi; rol, modül ve şube yetkilendirmesi.
- Şube ve tarih filtreli yönetici paneli; kayıtlı satış, gider, stok ve ödeme uyarıları.
- Masa kartları, açık adisyon taslağı, satış kaydı, indirim, birden fazla hesapla tahsilat; satış iadesi için gerekçeli ters kayıt.
- Ürünler, reçeteler, malzemeler; stok giriş/çıkış, sayım, fire ve iki taraflı şube transferi.
- Satışla birlikte reçete stok düşümü ve tahsilat hareketi; yetersiz stokta işlemin bütünüyle reddi.
- Kasa/banka/POS hesapları, açılış bakiyesi ve değiştirilemeyen hesap hareketleri.
- İşletme gideri, alış faturası ve manuel mali yükümlülük; vade takibi, ödeme ve ters kayıt. Fatura tahakkuku ile ödemesi ayrı tutulur.
- Tedarikçiler ve satın alma aşamaları; teslim alma stok hareketi, fatura ve ödeme bağlantısı.
- Personel kartları ve puantaj; basit bütçe, araç, yakıt ve enerji kayıtları.
- PDF/PNG/JPEG belge yükleme; dört Excel `.xlsx` raporu ve tarayıcı üzerinden PDF/yazdırma ekranları.
- İşlem geçmişi, işletme bazında JSON dışa aktarım ve yerel veritabanı/belge yedeği.
- Kayıtlı verilerle çalışan kural tabanlı yönetim asistanı; eksik veride hesaplama yapılmaz.

## Kapsam ve hesaplama

Bu ilk sürüm, tüm ayrıntılı ticari gereksinimlerin tamamlandığı anlamına gelmez. POS cihazı, banka, online sipariş, e-fatura/e-arşiv, OCR ve dil modeli servisleri **bağlı değildir**. Entegrasyon ekranları bu durumu açıkça gösterir. Otomatik bordro/mevzuat hesabı, ayrıntılı muhasebe defteri, otomatik vergi beyanı ve yedekten geri yükleme arayüzü yoktur.

Kayıtlı işletme sonucu = KDV hariç kayıtlı satış − satış anındaki reçete maliyeti − KDV hariç işletme gideri. Reçete veya maliyet eksikse sonuç hesaplanmaz. Tedarikçi alış faturası, reçete maliyetiyle aynı gideri ikinci kez saymamak için işletme giderine eklenmez. Bu gösterge kayıt dışındaki giderleri ve vergi sonrası muhasebe kârını kapsamaz. Stok maliyeti malzeme bazında ağırlıklı ortalamadır; şube bazında ayrı maliyet katmanları bulunmaz. Puantaj saatleri manuel kayıtlardır, yasal bordro hesabı değildir.

Çok işletmeli ve çok şubeli kayıt ayrımı uygulanır; **100 şube kapasitesi için yük testi yapılmadı**. SQLite tek sunuculu yerel kullanım için başlangıç altyapısıdır. Ticari SaaS yayını için PostgreSQL'e geçiş, HTTPS, dağıtık oturum/rate limit, bağımsız güvenlik ve yük testi, yedek geri dönüş denemesi ve ilgili servis entegrasyonları ayrıca tamamlanmalıdır. API `MISE_SECURE_COOKIE=1` ile HTTPS üzerinde güvenli çerez kullanabilir. Canlı veritabanını eşzamanlı OneDrive senkronizasyonuyla birden fazla bilgisayardan kullanmayın; tek sunucuda çalıştırıp yedek arşivini senkronize edin.

## Veri ve yedek

Yerel veri `backend/data` altında tutulur ve Git'e gönderilmez. **Yedekle.cmd**, `backend/data/backups` içine veritabanı ve belgeleri içeren ZIP yedeği oluşturur. Yönetici panelindeki JSON dışa aktarımı işletme kayıtlarını içerir; parola/oturum bilgilerini ve belge dosyalarını içermez. ZIP yedeğini geri almak için sunucuyu durdurup arşivdeki veritabanını ve `documents` klasörünü veri dizinine yerleştirin. Tüm yerel ZIP yedeği, aynı sunucudaki işletmeleri kapsar; işletme sahibine gönderilecek dışa aktarım için paneldeki işletme bazlı JSON kullanılır.

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
