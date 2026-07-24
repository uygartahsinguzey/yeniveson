# Berna V14 — Miki Edition

GitHub Pages üzerinde çalışan, yalnızca HTML/CSS/Vanilla JavaScript ile hazırlanmış cozy productivity game/PWA.

## V14 içeriği

- Günlük görevler, kategori, öncelik, süre ve ödül sistemi
- Ayarlanabilir Pomodoro, kısa/uzun mola, çalışma niyeti ve ders seçimi
- Kodla üretilen yağmur, kafe ve şömine ortam sesleri
- Haftalık çalışma planlayıcı, ders/proje ve çalışma blokları
- 7 günlük alışkanlık takibi, seri hesaplama, XP/coin ödülleri
- Ruh hâli, etiket, minnettarlık ve yarına not içeren cozy günlük
- Miki için tokluk, mutluluk, enerji, besleme, oynama ve uyuma
- Miki adı, uygulama adı ve dört kedi görünümü
- Mevsim ve hava seçilebilen piksel oda
- Coin mağazası, oda eşyaları ve Miki aksesuarları
- Günlük giriş ödülü, günlük görevler ve 10 başarım
- 7/30 günlük istatistikler, derslere göre odak süresi ve oturum geçmişi
- Yerel arkadaş kodları ve cihaz içi odak meydan okuması
- Blush, Lavanta, Orman ve Gece temaları
- Büyük yazı, yüksek kontrast ve azaltılmış hareket seçenekleri
- JSON yedekleme/geri yükleme
- V11 localStorage verilerini mümkün olduğunda otomatik taşıma
- PWA kurulumu, Service Worker ve çevrimdışı kullanım
- Mobil, tablet ve masaüstü uyumlu arayüz

## GitHub Pages kurulumu

1. ZIP dosyasını aç.
2. İçindeki tüm dosyaları GitHub deposunun kök dizinine yükle.
3. `Settings > Pages` bölümünde `Deploy from a branch` seç.
4. `main` ve `/root` seçeneklerini kaydet.
5. GitHub'ın oluşturduğu HTTPS adresini aç.

PWA ve çevrimdışı önbellek `file://` ile değil, GitHub Pages/HTTPS veya localhost üzerinde çalışır.

## Veri modeli notu

Bu sürümde backend yoktur. Arkadaş kodları ve meydan okumalar localStorage içinde tutulur; gerçek zamanlı çevrim içi kullanıcı veya senkronizasyon varmış gibi gösterilmez.
