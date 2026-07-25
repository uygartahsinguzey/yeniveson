# Berna V15 — Miki Edition

GitHub Pages üzerinde çalışan, HTML/CSS/Vanilla JavaScript ile hazırlanmış cozy productivity game/PWA.

## V15'te eklenenler

- Sınav adı, tarih, ders ve hedef not içeren geri sayım sistemi
- Flashcard ekleme, öğrenme kutusu, tekrar/biliyorum değerlendirmesi
- Çoktan seçmeli quiz ve quiz sonuç geçmişi
- Oda eşyalarını sürükleyerek yerleştirme ve konumları cihazda saklama
- Yeni üretilmiş Miki görseli ve besleme/oynama/uyuma/tarama animasyonları
- Tokluk, mutluluk, enerjiye ek olarak temizlik ihtiyacı
- Genişletilmiş günlük görev ve başarım sistemi
- Gece temasında metin, form, kart ve buton kontrast düzeltmeleri
- PeerJS ile cihazlar arası canlı arkadaş eşleşmesi ve ilerleme paylaşımı

## Korunan özellikler

V14'teki görevler, Pomodoro, planlayıcı, alışkanlıklar, günlük, mağaza, oda, istatistikler, yedekleme, temalar, PWA ve localStorage verileri korunmuştur. Uygulama aynı `bernaV14State` kaydını kullanır; mevcut veriler silinmez.

## Arkadaş sistemi nasıl çalışır?

- Her iki kullanıcı da internete bağlı şekilde uygulamayı açar.
- Bir kullanıcı diğerinin `MIKI-XXXX` kodunu ekler.
- İki uygulama aynı anda açık olduğunda eşleşme tamamlanır ve arkadaş iki tarafta da görünür.
- Eşleşmeden sonra seviye ve Pomodoro sayısı canlı bağlantı sırasında güncellenir.
- Bağlantı WebRTC/PeerJS üzerinden kurulur. Kalıcı sunucu hesabı veya giriş sistemi yoktur; iki tarafın en azından eşleşme anında uygulamayı açması gerekir.

## GitHub Pages kurulumu

1. ZIP dosyasını aç.
2. İçindeki tüm dosyaları GitHub deposunun kök dizinine yükle.
3. `Settings > Pages` bölümünde `Deploy from a branch` seç.
4. `main` ve `/root` seçeneklerini kaydet.
5. GitHub'ın oluşturduğu HTTPS adresini aç.

PWA ve Service Worker `file://` yerine GitHub Pages/HTTPS veya localhost üzerinde çalışır.
