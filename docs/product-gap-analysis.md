# RestoPusula: Ürün Karşılaştırması ve Eksik Yönler

İnceleme tarihi: 1 Ekim 2026

Bu değerlendirme, kaynak kodu ve README'de açıklanan gerçek kapsam ile rakiplerin herkese açık ürün sayfalarındaki yetenekleri karşılaştırır. Rakip sitelerdeki performans ve müşteri sayısı gibi pazarlama iddiaları bağımsız olarak doğrulanmamıştır. Entegrasyon veya uyumluluk varmış gibi varsayım yapılmamıştır.

## Bugünkü güçlü temel

- Çok işletmeli/çok şubeli yapı, rol ve modül izinleri; şube ve tarih filtreli yönetim paneli.
- Masa/adisyon, indirim, çoklu ödeme, iade için ters kayıt; tarifeye bağlı stok düşümü.
- Malzeme, reçete, stok hareketi, fire, sayım ve şubeler arası transfer.
- Gider, tedarikçi, satın alma, hesap hareketleri, personel/puantaj ve kaynak maliyetleri.
- Excel/PDF raporları, belge ekleri, denetim geçmişi ve yerel yedek.
- Türkçe arayüz, mobil yerleşim, PWA kısayolu ve kayıtlı verilerden hesaplanan göstergeler.
- Üretim iddiası yerine sınırlar açıkça belirtilmiş: SQLite yerel başlangıç sürümü; AI asistanı kural tabanlı; API anahtarı yalnızca model erişimini test ediyor.

## Rakip örnekleri

| Ürün | Herkese açık ürün sayfasında öne çıkanlar | RestoPusula'ya göre fark |
| --- | --- | --- |
| [Toast](https://www.toasttab.com/) | POS/ödeme, online sipariş, KDS, pazarlama ve sadakat, çalışan planlama/bordro, çok lokasyon ve entegrasyonlar; ürün sayfası çevrimdışı POS'u da vurguluyor. | RestoPusula'nın şube arka-ofis, stok, gider ve kayıt izlenebilirliği başlangıçta var; sipariş kanalları, KDS, müşteri bağlılığı, vardiya/bordro otomasyonu, POS donanım/ödeme ve çevrimdışı işlem yok. |
| [TouchBistro](https://www.touchbistro.com/) | Masa planı ve masa başı sipariş, ödeme, 50+ bulut raporu, personel yetkisi, stok/kâr yönetimi; KDS, online sipariş, rezervasyon, sadakat ve entegrasyon ürünleri. | RestoPusula masalı satış ve temel raporları sunuyor; fiziksel servis cihazlarıyla entegre masa planı, rezervasyon/bekleme listesi, KDS, misafir ilişkileri ve bulut rapor erişimi bulunmuyor. |
| [Lightspeed Restaurant](https://www.lightspeedhq.com/pos/restaurant/) | Çok lokasyon, online/QR/masa başı sipariş, entegre ödeme, stok, muhasebe, teslimat agregasyonu, KDS, iş gücü yönetimi, rezervasyon, ortak/partner entegrasyonları ve sektör kıyasları. | RestoPusula çok şubeli operasyon kayıtlarını topluyor; bağlı POS/ödeme, QR ve teslimat kanalı, muhasebe aktarımı, KDS, rezervasyon, iş gücü planlama, dış entegrasyon ekosistemi ve anonim benchmark yok. |

## Öncelikli ürün boşlukları

1. **Canlı servis dayanıklılığı:** Uygulama README'de tek makine/tek sunucu ve SQLite ile sınırlandırılmış. Eşzamanlı kullanım, otomatik senkronizasyon, gözlemlenebilirlik, felaket kurtarma ve geri yükleme tatbikatı olmadan ticari çok müşterili bulut yayınına hazır sayılamaz.
2. **POS ve ödeme entegrasyonu:** Kart/ödeme hesapları kaydedilebilir; fiziksel POS terminali veya ödeme kuruluşu bağlantısı yok. Gerçek tahsilat entegrasyonu, mutabakat ve hata/iadeye dayanıklı idempotent akış gerektirir.
3. **Siparişten mutfağa uçtan uca akış:** Online/QR/aggregator siparişleri, mutfak ekranı/yazıcı, sipariş durumları ve servis süresi ölçümü bulunmuyor.
4. **Mevzuat ve muhasebe:** E-fatura/e-arşiv, e-belge OCR, muhasebe dışa aktarım standardı, yasal bordro, vergi beyanı ve çift taraflı genel muhasebe defteri yok. Mevcut göstergeler muhasebe kârı veya yasal hesaplama yerine geçmez.
5. **Ekip/konuk deneyimi:** Puantaj kaydı var ancak vardiya çizelgesi, izin, bahşiş/paylaştırma ve yasal bordro otomasyonu yok. Müşteri profili, rezervasyon, sadakat, hediye kartı ve CRM yok.
6. **Gerçek AI karar desteği:** Kural tabanlı özet mevcut. Sağlayıcı anahtarı bağlantı testi için ayarlanabiliyor, ancak konuşmalı model analizi, açıklanabilir kaynak referansları, eylem onayı ve AI güvenlik sınırları yok.
7. **Kurulum ve yardım:** Rol bazlı onboarding, örnek veri içermeyen sihirbaz (şimdi eklendi), bağlam içi yardım ve destek/sağlık durumu merkezi geliştirilmelidir.

## Önerilen sıra

- **P0, yayına hazırlık:** PostgreSQL ve migrasyon planı, HTTPS/secret yönetimi, rate limit ve oturum stratejisi, otomatik şifreli yedek, geri yükleme tatbikatı, audit ve hata izleme, yük/güvenlik testleri.
- **P1, operasyonun tamamlanması:** Önce bir Türkiye ödeme/POS sağlayıcısı ve bir e-belge/muhasebe entegrasyonu için kapsam seçin; webhook imzası, tekrar işleme, mutabakat ve ters kayıt senaryolarını test edin.
- **P2, servis akışı:** KDS veya mutfak yazıcısı ve online/QR sipariş için dar bir uçtan uca pilot; masa/adisyon durumlarını ve servis süresini ölçün.
- **P3, büyüme:** Vardiya/izin ve bordro sağlayıcı bağlantısı, rezervasyon/müşteri sadakati; yalnızca izinli ve anonimleştirilmiş yeterli veriyle şube benchmark'ı.
- **P4, AI:** Önce salt okunur, kaynak ve dönem gösteren yanıtlar; eylem önerileri için açık kullanıcı onayı ve veri aktarım tercihi.

## Sonuç

RestoPusula'nın ayırt edici mevcut değeri Türkçe, çok şubeli arka-ofis ve stok/finans kayıtlarının tek yerde tutulmasıdır. Toast, TouchBistro ve Lightspeed ise kamusal ürün anlatımlarında misafirden siparişe, mutfaktan ödemeye uzanan entegre servis platformlarıdır. Bu nedenle uygulama bugün “ultra premium, canlıya hazır POS” olarak sunulmamalı; önce güvenli bulut altyapısı ve seçilmiş yerel entegrasyonlarla ürün kapsamı tamamlanmalıdır. Görsel iyileştirmeler bu işlevsel farkları kapatmaz.
