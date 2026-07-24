# Berna V5.2 Lite

Bu sürümde kırık görsel hatasına yol açabilecek tüm görsel bağımlılıkları kaldırıldı.

## Kaldırılanlar

- Kedi görselleri ve kedi seçimi
- Oda, mobilya ve mağaza sistemi
- Mevsim, hava ve gün/gece görselleri
- Mama, büyüme ve coin ekonomisi
- Ayrı ikon ve `assets` klasörleri

## Kalan özellikler

- Pomodoro odak sayacı
- Kısa ve uzun mola
- Tiklenebilir günlük ajanda
- Ajanda filtreleri ve tamamlanma yüzdesi
- Genel yapılacaklar listesi
- Ders/kategori yönetimi
- Haftalık odak grafiği
- Genel başarı rozetleri
- Sınav geri sayımı
- Oturum günlüğü
- Veri yedekleme ve geri yükleme
- Tema seçimi
- Tarayıcı içinde üretilen odak sesleri

## GitHub Pages kurulumu

Dosyaların tamamını repository ana dizinine yükleyin. Ana dizinde doğrudan şu dosyalar görünmelidir:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- `README.md`

`Settings → Pages → Deploy from a branch → main → / (root)` seçilmelidir.

Bu pakette `assets` veya `icons` klasörü bulunmaz; dolayısıyla eksik resim yolu oluşamaz.
