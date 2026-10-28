# 📄 PDF Studio (PWA)

> **Modern, Minimalist ve Hızlı PDF Oluşturucu & Görsel Düzenleyici**  
> Düz metinleri özelleştirilmiş PDF belgelerine dönüştürün, mevcut PDF'leri açın, sayfalarını düzenleyin, filigran & not ekleyin ve tek tıkla doğrudan indirin.

---

## 🌟 Yeni Eklenen Özellikler

### 📱 1. Tam Kapsamlı PWA (Progressive Web App) Desteği
- **Çevrimdışı Çalışma (Offline):** Service Worker (`sw.js`) sayesinde internet bağlantısı olmadan da tam işlevsel çalışır.
- **Uygulama Olarak Yükleme:** Bilgisayarınıza (Chrome, Edge) veya telefonunuza (Android, iOS) yerel bir uygulama gibi yüklenebilir.
- **Zengin Web Manifest:** Çoklu çözünürlükte ikonlar (192px, 512px, maskable), ekran görüntüleri, kısayollar (*Yeni PDF*, *PDF Düzenle*) ve kategori tanımlamaları.

### 🌗 2. Aydınlık / Karanlık Tema Desteği
- **Sistem Varsayılanı (System Default):** Cihazınızın sistem temasına (Dark/Light) göre otomatik uyum sağlar ve anlık değişiklikleri dinamik olarak takip eder.
- **Manuel Kontrol:** Üst menüdeki butonlar aracılığıyla dilediğiniz zaman tek tıkla **Sistem**, **Aydınlık** veya **Karanlık** moduna geçebilirsiniz (Tercihiniz `localStorage` ile hatırlanır).

---

## ✨ Temel Özellikler

### 📝 Düz Metinden PDF Oluşturucu
- **Geniş Metin Alanı & Hazır Şablonlar:** Dilekçe, Rapor, Sözleşme, Not şablonları.
- **Canlı Önizleme (WYSIWYG):** Metni yazdıkça veya ayarları değiştirdikçe gerçek zamanlı render.
- **Detaylı Biçimlendirme Kontrolleri:**
  - Sayfa Boyutu: A4, A5, A3, Letter, Legal
  - Sayfa Yönü: Dikey (Portrait) veya Yatay (Landscape)
  - Tipografi: Yazı boyutu (pt), satır yüksekliği, hizalama (sola, ortala, sağa, iki yana yasla)
  - Kenar Boşlukları (Margin): Üst, Alt, Sol, Sağ boşlukları milimetre cinsinden hassas ayarlama
  - Renkler: Özel metin rengi ve sayfa arka plan rengi
  - Üst & Alt Bilgi: Sayfa başlığı, dipnot ve dinamik sayfa numaralandırması (`Sayfa X / Y`)
  - Filigran (Watermark): Özel metin, açı (-90° / +90°), şeffaflık/opaklık, boyut ve renk özelleştirmeleri

### 📑 PDF Görüntüleyici & Görsel Düzenleyici
- **PDF Açma:** Sürükle & bırak veya cihazdan dosya seçerek mevcut PDF'leri açma.
- **Sayfa Gezintisi & Yakınlaştırma:** Sayfa geçişleri, yakınlaştırma/uzaklaştırma.
- **Metin Ekleme:** Sayfa üzerinde istenilen noktaya tıklayarak taşınabilir ve düzenlenebilir metin ekleme.
- **Mevcut PDF'e Filigran Ekleme:** Tüm sayfalara veya sadece seçilen sayfaya filigran basma.
- **Karartma / Sansürleme:** Hassas bilgileri gizlemek için siyah sansür blokları ekleme.
- **Sayfa İşlemleri:** Sayfayı 90° döndürme veya istenmeyen sayfaları silme.
- **Metni Aktar (Extract Text):** PDF içindeki tüm metinleri çıkarıp doğrudan oluşturucuya aktararak düzenleme.

### ⚡ Tek Tıkla Doğrudan İndirme
- Tarayıcı yazdırma (`window.print()`) penceresi açılmaz.
- PDF dosyası istemci tarafında derlenir ve doğrudan `.pdf` formatında indirilir.

### 🇹🇷 Tam Türkçe & Unicode Desteği
- Gömülü `DejaVu Sans` fontu sayesinde `ş, ğ, ç, ı, ö, ü, İ` gibi tüm Türkçe karakterler ve özel semboller kusursuz biçimde işlenir.

---

## 🚀 Canlı Kullanım (GitHub Pages)

Projeyi doğrudan tarayıcınızda açıp kullanmak veya cihazınıza uygulama olarak yüklemek için:  
🔗 **[https://meucak.github.io/pdf-studio/](https://meucak.github.io/pdf-studio/)**

---

## 🛠️ Yerel Çalıştırma

Projeyi bilgisayarınızda çevrimdışı olarak çalıştırmak için:
1. Depoyu klonlayın veya indirin.
2. `index.html` dosyasını herhangi bir web tarayıcısında açın.
3. Tamamen istemci taraflıdır, sunucu kurulumu gerektirmez.

---

## 📜 Lisans
MIT License
