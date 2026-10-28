/**
 * PDF Studio - Ana Uygulama Mantığı
 * Düz Metinden PDF Oluşturma & PDF Düzenleme
 */

// PDF.js Worker yapılandırması
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
}

// Global Değişkenler ve Durumlar
const state = {
  activeMode: 'creator', // 'creator' | 'editor'
  fontBytes: null,
  isFontLoaded: false,
  
  // Oluşturucu Durumu
  creator: {
    debounceTimer: null,
    currentPdfBytes: null,
    isGenerating: false,
    pageCount: 1
  },

  // Düzenleyici Durumu
  editor: {
    pdfDoc: null,         // PDF.js doc
    rawBytes: null,       // Orijinal dosya arrayBuffer
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    activeTool: 'select', // 'select' | 'text' | 'redact'
    annotations: {},      // sayfaNo -> [ { id, type, x, y, width, height, text, size, color, bg } ]
    pageRotations: {},    // sayfaNo -> derece (0, 90, 180, 270)
    deletedPages: new Set(),
    watermarks: []        // [ { text, angle, size, color, opacity, scope: 'all'|'current', page } ]
  }
};

// Hazır Şablonlar
const TEMPLATES = {
  dilekce: `T.C.
KADIKÖY KAYMAKAMLIĞINA
İlçe Milli Eğitim Müdürlüğü

Konu: Bilgi Edinme ve Belge Talebi Hakkında

İlçeniz sınırları dahilinde ikamet etmekteyim. 4982 sayılı Bilgi Edinme Hakkı Kanunu kapsamında, mahallemizde yapımı devam eden ilkokul binasının tamamlanma takvimi ve 2026-2027 eğitim-öğretim yılına yetişip yetişmeyeceği hususunda tarafıma yazılı bilgi verilmesini arz ve talep ederim.

Gereğini bilgilerinize saygılarımla sunarım.

Adres: Atatürk Cad. No: 42/3 Kadıköy / İstanbul
Telefon: 0555 123 45 67
E-posta: ornek@email.com

28 Ekim 2026
Şemsettin Yılmaz
İmza:`,

  rapor: `PROJE DEĞERLENDİRME VE İLERLEME RAPORU

1. YÖNETİCİ ÖZETİ
Bu rapor, 2026 yılı 3. çeyreğinde tamamlanan yazılım geliştirme ve altyapı iyileştirme çalışmalarının sonuçlarını özetlemektedir. Hedeflenen performans metriklerine başarıyla ulaşılmış, sistem gecikme süresi %40 oranında azaltılmıştır.

2. YAPILAN ÇALIŞMALAR
- Veritabanı sorgu optimizasyonları ve indeksleme yapıldı.
- İstemci taraflı PDF oluşturma ve görsel düzenleme modülleri devreye alındı.
- Güvenlik ve veri gizliliği standartları denetlendi.

3. SONUÇ VE ÖNERİLER
Bir sonraki aşamada bulut depolama entegrasyonu tamamlanacak ve kullanıcı testleri gerçekleştirilecektir.

Hazırlayan: Proje Koordinatörü
Tarih: 28.10.2026`,

  sozlesme: `HİZMET SÖZLEŞMESİ TASLAĞI

Madde 1 - Taraflar:
İşbu sözleşme, bir tarafta HİZMET ALAN ile diğer tarafta HİZMET VEREN arasında aşağıdaki şartlar dairesinde akdedilmiştir.

Madde 2 - Sözleşmenin Konusu:
Hizmet Veren'in, Hizmet Alan tarafından talep edilen dijital belge yönetimi ve optimizasyon hizmetlerini sunmasıdır.

Madde 3 - Teslimat ve Ödeme Şartları:
- Hizmetler, iş takvimine uygun olarak 30 iş günü içinde eksiksiz teslim edilecektir.
- Ödeme, onay tutanağının imzalanmasının ardından 7 iş günü içinde yapılacaktır.

Madde 4 - Gizlilik:
Taraflar, sözleşme süresince elde ettikleri ticari ve teknik bilgileri gizli tutmayı taahhüt eder.

Tarih: 28 Ekim 2026
Hizmet Alan                Hizmet Veren
(İmza / Kaşe)              (İmza / Kaşe)`,

  notlar: `HAFTALIK STRATEJİ VE KOORDİNASYON TOPLANTISI

Tarih: 28 Ekim 2026
Katılımcılar: Mühendislik Ekibi, Tasarım Birimi, Ürün Yöneticisi

GÜNDEM MADDELERİ:
1. Kullanıcı deneyimi sadeleştirme adımları
2. Belge dışa aktarma hızlarının analizi
3. Filigran ve özel sayfa biçimlendirmeleri

ALINAN KARARLAR:
- Sayfa önizlemeleri anlık (canlı) olarak güncellenecek.
- Türkçe karakter desteği için DejaVu Sans yazı tipi entegre edildi.
- Doğrudan tek tıkla indirme akışı standart hale getirildi.

Bir Sonraki Toplantı: 04 Kasım 2026, Saat 10:00`
};

// ----------------------------------------------------
// Başlangıç Kurulumu
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initFont();
  initCreatorEvents();
  
  // URL parametresi ile mod kontrolü (?mode=editor veya ?mode=creator)
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode');
  if (initialMode === 'editor') {
    switchMode('editor');
  } else {
    // Başlangıç metni olarak dilekçe şablonunu yükle
    loadTemplate('dilekce');
  }
});

// ----------------------------------------------------
// TEMA YÖNETİMİ (Sistem Varsayılanı / Aydınlık / Karanlık)
// ----------------------------------------------------
let currentThemePreference = 'system';

function initTheme() {
  currentThemePreference = localStorage.getItem('pdf_studio_theme') || 'system';
  applyTheme(currentThemePreference);

  // Sistem teması değişikliklerini dinamik olarak dinle
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentThemePreference === 'system') {
      applyTheme('system');
    }
  });
}

function setThemePreference(pref) {
  currentThemePreference = pref;
  localStorage.setItem('pdf_studio_theme', pref);
  applyTheme(pref);

  const labels = { system: 'Sistem Teması', light: 'Aydınlık Tema', dark: 'Karanlık Tema' };
  showToast(labels[pref] + ' etkinleştirildi.');
}

function applyTheme(pref) {
  const isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Buton aktiflik sınıflarını güncelle
  const btnSystem = document.getElementById('themeBtnSystem');
  const btnLight = document.getElementById('themeBtnLight');
  const btnDark = document.getElementById('themeBtnDark');

  if (btnSystem) btnSystem.classList.toggle('active', pref === 'system');
  if (btnLight) btnLight.classList.toggle('active', pref === 'light');
  if (btnDark) btnDark.classList.toggle('active', pref === 'dark');

  // Meta theme-color rengini güncelle
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0b1120' : '#2563eb');
  }
}

// Font Yükleme (DejaVu Sans base64)
function initFont() {
  try {
    if (window.DEJAVU_SANS_BASE64) {
      const binaryString = atob(window.DEJAVU_SANS_BASE64);
      const len = binaryString.length;
      state.fontBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        state.fontBytes[i] = binaryString.charCodeAt(i);
      }
      state.isFontLoaded = true;
      console.log('DejaVu Sans fontu başarıyla yüklendi.');
    }
  } catch (err) {
    console.warn('Font yüklenirken hata:', err);
  }
}

// Sekme Değiştirme
function switchMode(mode) {
  state.activeMode = mode;
  document.getElementById('tabCreator').classList.toggle('active', mode === 'creator');
  document.getElementById('tabEditor').classList.toggle('active', mode === 'editor');
  
  document.getElementById('creatorSection').style.display = mode === 'creator' ? 'flex' : 'none';
  document.getElementById('editorSection').style.display = mode === 'editor' ? 'flex' : 'none';

  if (mode === 'creator') {
    debouncedUpdatePreview();
  }
}

// ----------------------------------------------------
// BÖLÜM 1: METİNDEN PDF OLUŞTURUCU MANTIĞI
// ----------------------------------------------------
function initCreatorEvents() {
  const textInput = document.getElementById('creatorTextInput');
  textInput.addEventListener('input', () => {
    updateWordCharCount();
    debouncedUpdatePreview();
  });
}

function updateWordCharCount() {
  const text = document.getElementById('creatorTextInput').value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('charCount').innerText = `${chars} karakter | ${words} kelime`;
}

function clearCreatorText() {
  document.getElementById('creatorTextInput').value = '';
  updateWordCharCount();
  debouncedUpdatePreview();
}

function loadTemplate(key) {
  if (TEMPLATES[key]) {
    document.getElementById('creatorTextInput').value = TEMPLATES[key];
    updateWordCharCount();
    debouncedUpdatePreview();
  }
}

function toggleWatermarkControls() {
  const enabled = document.getElementById('watermarkToggle').checked;
  document.getElementById('watermarkControls').style.display = enabled ? 'block' : 'none';
  debouncedUpdatePreview();
}

function debouncedUpdatePreview() {
  if (state.creator.debounceTimer) {
    clearTimeout(state.creator.debounceTimer);
  }
  state.creator.debounceTimer = setTimeout(() => {
    generatePdfPreview();
  }, 350);
}

// PDF Oluşturma (Core Engine)
async function compilePdfFromText() {
  const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
  const doc = await PDFDocument.create();

  if (window.fontkit) {
    doc.registerFontkit(fontkit);
  }

  // Yazı Tipi Seçimi
  const fontChoice = document.getElementById('fontFamilySelect').value;
  let font;
  if (fontChoice === 'dejavu' && state.fontBytes) {
    font = await doc.embedFont(state.fontBytes);
  } else if (fontChoice === 'times') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  } else if (fontChoice === 'courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else {
    // dejavu varsayılan veya helvetica
    if (state.fontBytes) {
      font = await doc.embedFont(state.fontBytes);
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica);
    }
  }

  // Sayfa Boyutları (pt)
  const sizeChoice = document.getElementById('pageSizeSelect').value;
  let pageDims = [595.28, 841.89]; // A4 varsayılan
  if (sizeChoice === 'A5') pageDims = [419.53, 595.28];
  else if (sizeChoice === 'A3') pageDims = [841.89, 1190.55];
  else if (sizeChoice === 'LETTER') pageDims = [612.00, 792.00];
  else if (sizeChoice === 'LEGAL') pageDims = [612.00, 1008.00];

  const orientation = document.getElementById('pageOrientationSelect').value;
  let [pageW, pageH] = pageDims;
  if (orientation === 'landscape') {
    [pageW, pageH] = [pageH, pageW];
  }

  // Kenar Boşlukları (mm -> pt)
  const mmToPt = mm => (mm * 72) / 25.4;
  const mTop = mmToPt(parseFloat(document.getElementById('marginTop').value) || 20);
  const mBottom = mmToPt(parseFloat(document.getElementById('marginBottom').value) || 20);
  const mLeft = mmToPt(parseFloat(document.getElementById('marginLeft').value) || 20);
  const mRight = mmToPt(parseFloat(document.getElementById('marginRight').value) || 20);

  const fontSize = parseFloat(document.getElementById('fontSizeInput').value) || 12;
  const lineSpacingMult = parseFloat(document.getElementById('lineHeightInput').value) || 1.5;
  const lineHeight = fontSize * lineSpacingMult;

  const hexToRgb = hex => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return rgb((num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255);
  };

  const textColor = hexToRgb(document.getElementById('textColorInput').value);
  const bgColor = hexToRgb(document.getElementById('bgColorInput').value);

  const headerText = document.getElementById('headerTextInput').value.trim();
  const footerText = document.getElementById('footerTextInput').value.trim();
  const showPageNumbers = document.getElementById('pageNumberToggle').checked;

  const watermarkEnabled = document.getElementById('watermarkToggle').checked;
  const wmText = document.getElementById('watermarkText').value.trim();
  const wmAngle = parseFloat(document.getElementById('watermarkAngle').value) || -45;
  const wmSize = parseFloat(document.getElementById('watermarkSize').value) || 56;
  const wmColor = hexToRgb(document.getElementById('watermarkColor').value);
  const wmOpacity = (parseFloat(document.getElementById('watermarkOpacity').value) || 25) / 100;

  const align = document.getElementById('textAlignSelect').value;

  const contentW = pageW - mLeft - mRight;
  const headerSpace = headerText ? 24 : 0;
  const footerSpace = (footerText || showPageNumbers) ? 24 : 0;
  const contentTop = pageH - mTop - headerSpace;
  const contentBottom = mBottom + footerSpace;

  // Metni kelimelere ve satırlara bölme (Word Wrapping)
  const rawText = document.getElementById('creatorTextInput').value || ' ';
  const paragraphs = rawText.split('\n');
  const allLines = [];

  for (const para of paragraphs) {
    if (para === '') {
      allLines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(testLine, fontSize);
      } catch (e) {
        // Beklenmeyen karakter olursa genişlik tahmini
        width = testLine.length * (fontSize * 0.55);
      }

      if (width <= contentW) {
        currentLine = testLine;
      } else {
        if (currentLine) allLines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) allLines.push(currentLine);
  }

  // Sayfalara yerleştirme
  const pagesData = [];
  let currentPageLines = [];
  let currentY = contentTop;

  for (const line of allLines) {
    if (currentY - lineHeight < contentBottom) {
      pagesData.push(currentPageLines);
      currentPageLines = [line];
      currentY = contentTop - lineHeight;
    } else {
      currentPageLines.push(line);
      currentY -= lineHeight;
    }
  }
  if (currentPageLines.length > 0 || pagesData.length === 0) {
    pagesData.push(currentPageLines);
  }

  const totalPages = pagesData.length;

  // Sayfaları Çizme
  for (let i = 0; i < totalPages; i++) {
    const page = doc.addPage([pageW, pageH]);

    // Arka Plan Rengi
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: bgColor
    });

    // Filigran Çizimi (En arka katmanda metnin altında)
    if (watermarkEnabled && wmText) {
      let wmWidth = 0;
      try {
        wmWidth = font.widthOfTextAtSize(wmText, wmSize);
      } catch (e) {
        wmWidth = wmText.length * (wmSize * 0.5);
      }

      page.drawText(wmText, {
        x: pageW / 2 - (wmWidth / 2) * Math.cos(wmAngle * Math.PI / 180),
        y: pageH / 2 - (wmWidth / 2) * Math.sin(wmAngle * Math.PI / 180),
        size: wmSize,
        font: font,
        color: wmColor,
        opacity: wmOpacity,
        rotate: degrees(wmAngle)
      });
    }

    // Üst Bilgi (Header)
    if (headerText) {
      try {
        page.drawText(headerText, {
          x: mLeft,
          y: pageH - mTop + 6,
          size: 9,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      } catch (e) {}
    }

    // Alt Bilgi & Sayfa Numarası
    if (footerText) {
      try {
        page.drawText(footerText, {
          x: mLeft,
          y: mBottom - 14,
          size: 9,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      } catch (e) {}
    }

    if (showPageNumbers) {
      const pageStr = `${i + 1} / ${totalPages}`;
      let pageStrWidth = 20;
      try {
        pageStrWidth = font.widthOfTextAtSize(pageStr, 9);
      } catch (e) {}
      
      try {
        page.drawText(pageStr, {
          x: pageW - mRight - pageStrWidth,
          y: mBottom - 14,
          size: 9,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      } catch (e) {}
    }

    // Paragraf Metinlerini Çiz
    let lineY = contentTop - fontSize;
    const lines = pagesData[i];

    for (const line of lines) {
      if (line !== '') {
        let textX = mLeft;
        let lineWidth = 0;
        try {
          lineWidth = font.widthOfTextAtSize(line, fontSize);
        } catch (e) {
          lineWidth = line.length * (fontSize * 0.55);
        }

        if (align === 'center') {
          textX = mLeft + Math.max(0, (contentW - lineWidth) / 2);
        } else if (align === 'right') {
          textX = mLeft + Math.max(0, contentW - lineWidth);
        }

        try {
          page.drawText(line, {
            x: textX,
            y: lineY,
            size: fontSize,
            font: font,
            color: textColor
          });
        } catch (err) {
          console.warn('drawText satır çizilemedi:', err);
        }
      }
      lineY -= lineHeight;
    }
  }

  state.creator.pageCount = totalPages;
  document.getElementById('pageCountBadge').innerText = `${totalPages} Sayfa`;

  const finalPdfBytes = await doc.save();
  state.creator.currentPdfBytes = finalPdfBytes;
  return finalPdfBytes;
}

// Canlı Önizleme Oluşturma & PDF.js ile Render Etme
async function generatePdfPreview(showToastFlag = false) {
  if (state.creator.isGenerating) return;
  state.creator.isGenerating = true;
  document.getElementById('previewLoading').style.display = 'flex';

  try {
    const pdfBytes = await compilePdfFromText();
    state.creator.currentPdfBytes = pdfBytes;

    // PDF.js ile sayfaları render et (Buffer'ın detach olmaması için kopya gönderiyoruz)
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
    const pdf = await loadingTask.promise;
    
    const wrapper = document.getElementById('previewPagesWrapper');
    wrapper.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.25 });

      const canvas = document.createElement('canvas');
      canvas.className = 'preview-page-canvas';
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      };

      await page.render(renderContext).promise;
      wrapper.appendChild(canvas);
    }

    if (showToastFlag) {
      showToast('Önizleme güncellendi.');
    }
  } catch (err) {
    console.error('Önizleme oluşturulurken hata:', err);
  } finally {
    state.creator.isGenerating = false;
    document.getElementById('previewLoading').style.display = 'none';
  }
}

// Tek Tıkla PDF İndirme (Yazdır penceresi açmadan doğrudan indirme)
async function downloadGeneratedPdf() {
  try {
    let pdfBytes = state.creator.currentPdfBytes;
    if (!pdfBytes) {
      pdfBytes = await compilePdfFromText();
    }

    let filename = document.getElementById('exportFileName').value.trim() || 'belgem.pdf';
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    downloadBlob(pdfBytes, filename);
    showToast(`"${filename}" başarıyla indirildi!`);
  } catch (err) {
    console.error('İndirme hatası:', err);
    showToast('PDF indirilirken bir hata oluştu.');
  }
}

// ----------------------------------------------------
// BÖLÜM 2: PDF GÖRÜNTÜLEYİCİ VE DÜZENLEYİCİ MANTIĞI
// ----------------------------------------------------
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files && files[0] && files[0].type === 'application/pdf') {
    loadPdfFromFile(files[0]);
  } else {
    showToast('Lütfen geçerli bir PDF dosyası bırakın.');
  }
}

function handlePdfFileUpload(e) {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    loadPdfFromFile(file);
  }
}

async function loadPdfFromFile(file) {
  try {
    showToast('PDF açılıyor...');
    const arrayBuffer = await file.arrayBuffer();
    state.editor.rawBytes = new Uint8Array(arrayBuffer.slice(0));
    
    // PDF.js ile yükle (Buffer'ın detach olmasını önlemek için ayrı kopya verilir)
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    state.editor.pdfDoc = await loadingTask.promise;
    state.editor.numPages = state.editor.pdfDoc.numPages;
    state.editor.currentPage = 1;
    state.editor.scale = 1.0;
    state.editor.annotations = {};
    state.editor.pageRotations = {};
    state.editor.deletedPages.clear();
    state.editor.watermarks = [];

    document.getElementById('editorDropzone').style.display = 'none';
    document.getElementById('editorWorkspace').style.display = 'flex';

    renderCurrentEditorPage();
    showToast(`PDF yüklendi (${state.editor.numPages} sayfa).`);
  } catch (err) {
    console.error('PDF yükleme hatası:', err);
    showToast('PDF dosyası açılırken hata oluştu.');
  }
}

function closeLoadedPdf() {
  state.editor.pdfDoc = null;
  state.editor.rawBytes = null;
  document.getElementById('editorDropzone').style.display = 'flex';
  document.getElementById('editorWorkspace').style.display = 'none';
  document.getElementById('pdfFileInput').value = '';
}

// Düzenleyici Sayfasını Render Etme
async function renderCurrentEditorPage() {
  if (!state.editor.pdfDoc) return;

  const pageNum = state.editor.currentPage;
  document.getElementById('editorPageInfo').innerText = `${pageNum} / ${state.editor.numPages}`;
  document.getElementById('editorZoomVal').innerText = `${Math.round(state.editor.scale * 100)}%`;

  const page = await state.editor.pdfDoc.getPage(pageNum);
  const rotation = (state.editor.pageRotations[pageNum] || 0);
  const viewport = page.getViewport({ scale: state.editor.scale * 1.5, rotation: rotation });

  const canvas = document.getElementById('pdfRenderCanvas');
  const ctx = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  // Annotasyon katmanını güncelle
  renderAnnotationElements();
}

function changeEditorPage(delta) {
  const newPage = state.editor.currentPage + delta;
  if (newPage >= 1 && newPage <= state.editor.numPages) {
    state.editor.currentPage = newPage;
    renderCurrentEditorPage();
  }
}

function changeEditorZoom(delta) {
  const newScale = Math.max(0.4, Math.min(2.5, state.editor.scale + delta));
  state.editor.scale = newScale;
  renderCurrentEditorPage();
}

function setEditorTool(tool) {
  state.editor.activeTool = tool;
  
  document.getElementById('toolSelect').classList.toggle('active', tool === 'select');
  document.getElementById('toolText').classList.toggle('active', tool === 'text');
  document.getElementById('toolRedact').classList.toggle('active', tool === 'redact');

  const banner = document.getElementById('toolTipBanner');
  const tipText = document.getElementById('toolTipText');
  const overlay = document.getElementById('annotationOverlay');

  overlay.className = 'annotation-overlay';

  if (tool === 'text') {
    banner.style.display = 'flex';
    tipText.innerText = 'Metin eklemek istediğiniz sayfadaki konuma tıklayın.';
    overlay.classList.add('tool-active-text');
  } else if (tool === 'redact') {
    banner.style.display = 'flex';
    tipText.innerText = 'Karartmak / gizlemek istediğiniz konuma tıklayın.';
    overlay.classList.add('tool-active-redact');
  } else {
    banner.style.display = 'none';
  }
}

// Tıklama ile Sayfaya Yeni Eleman Ekleme
function handleOverlayClick(e) {
  if (e.target !== document.getElementById('annotationOverlay')) return;

  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const pageNum = state.editor.currentPage;
  if (!state.editor.annotations[pageNum]) {
    state.editor.annotations[pageNum] = [];
  }

  if (state.editor.activeTool === 'text') {
    const item = {
      id: 'note_' + Date.now(),
      type: 'text',
      x: x,
      y: y,
      text: 'Yeni Metin',
      fontSize: 14,
      color: '#111827',
      bgColor: 'transparent'
    };
    state.editor.annotations[pageNum].push(item);
    renderAnnotationElements();
    setEditorTool('select');
  } else if (state.editor.activeTool === 'redact') {
    const item = {
      id: 'redact_' + Date.now(),
      type: 'redact',
      x: x,
      y: y,
      width: 140,
      height: 24,
      color: '#000000'
    };
    state.editor.annotations[pageNum].push(item);
    renderAnnotationElements();
    setEditorTool('select');
  }
}

// Eklenen Not ve Karartmaları Çizme
function renderAnnotationElements() {
  const overlay = document.getElementById('annotationOverlay');
  overlay.innerHTML = '';

  const pageNum = state.editor.currentPage;
  const items = state.editor.annotations[pageNum] || [];

  items.forEach(item => {
    if (item.type === 'text') {
      const el = document.createElement('div');
      el.className = 'placed-text-item';
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
      el.style.fontSize = item.fontSize + 'px';
      el.style.color = item.color;

      el.innerHTML = `
        <div class="placed-item-controls">
          <button title="Boyut Küçült" onclick="resizeTextItem('${item.id}', -2)">A-</button>
          <button title="Boyut Büyüt" onclick="resizeTextItem('${item.id}', 2)">A+</button>
          <button title="Sil" onclick="deleteAnnotationItem('${item.id}')">✕</button>
        </div>
        <div class="placed-text-content" contenteditable="true" oninput="updateTextContent('${item.id}', this.innerText)">${item.text}</div>
      `;

      makeDraggable(el, item);
      overlay.appendChild(el);
    } else if (item.type === 'redact') {
      const el = document.createElement('div');
      el.className = 'placed-redact-item';
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
      el.style.width = item.width + 'px';
      el.style.height = item.height + 'px';
      el.style.backgroundColor = item.color;

      el.innerHTML = `
        <div class="placed-item-controls">
          <button title="Sil" onclick="deleteAnnotationItem('${item.id}')">✕</button>
        </div>
      `;

      makeDraggable(el, item);
      overlay.appendChild(el);
    }
  });
}

function makeDraggable(el, item) {
  let isDragging = false;
  let startX = 0, startY = 0;

  el.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('placed-text-content')) {
      return;
    }
    isDragging = true;
    startX = e.clientX - el.offsetLeft;
    startY = e.clientY - el.offsetTop;
    el.classList.add('selected');

    const onMouseMove = moveEvent => {
      if (!isDragging) return;
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      el.style.left = newX + 'px';
      el.style.top = newY + 'px';
      item.x = newX;
      item.y = newY;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function updateTextContent(id, newText) {
  const pageNum = state.editor.currentPage;
  const item = (state.editor.annotations[pageNum] || []).find(i => i.id === id);
  if (item) item.text = newText;
}

function resizeTextItem(id, delta) {
  const pageNum = state.editor.currentPage;
  const item = (state.editor.annotations[pageNum] || []).find(i => i.id === id);
  if (item) {
    item.fontSize = Math.max(8, Math.min(60, item.fontSize + delta));
    renderAnnotationElements();
  }
}

function deleteAnnotationItem(id) {
  const pageNum = state.editor.currentPage;
  state.editor.annotations[pageNum] = (state.editor.annotations[pageNum] || []).filter(i => i.id !== id);
  renderAnnotationElements();
  showToast('Öğe silindi.');
}

// Sayfa Döndürme (90 derece)
function rotateCurrentPage() {
  const p = state.editor.currentPage;
  state.editor.pageRotations[p] = ((state.editor.pageRotations[p] || 0) + 90) % 360;
  renderCurrentEditorPage();
  showToast(`Sayfa ${p} 90° döndürüldü.`);
}

// Sayfa Silme
function deleteCurrentPage() {
  if (state.editor.numPages <= 1) {
    showToast('Belgedeki tek sayfa silinemez.');
    return;
  }
  const p = state.editor.currentPage;
  state.editor.deletedPages.add(p);
  showToast(`Sayfa ${p} silindi olarak işaretlendi.`);
  // Sonraki veya önceki sayfaya geç
  if (p < state.editor.numPages) {
    state.editor.currentPage++;
  } else {
    state.editor.currentPage--;
  }
  renderCurrentEditorPage();
}

// Filigran Modalı İşlemleri (Editor)
function openEditorWatermarkModal() {
  document.getElementById('editorWatermarkModal').style.display = 'flex';
}

function closeEditorWatermarkModal() {
  document.getElementById('editorWatermarkModal').style.display = 'none';
}

function applyEditorWatermark() {
  const text = document.getElementById('edWatermarkText').value.trim();
  if (!text) {
    showToast('Lütfen bir filigran metni girin.');
    return;
  }
  const angle = parseFloat(document.getElementById('edWatermarkAngle').value) || -45;
  const size = parseFloat(document.getElementById('edWatermarkSize').value) || 60;
  const color = document.getElementById('edWatermarkColor').value;
  const opacity = (parseFloat(document.getElementById('edWatermarkOpacity').value) || 30) / 100;
  const scope = document.querySelector('input[name="edWatermarkScope"]:checked').value;

  state.editor.watermarks.push({
    text,
    angle,
    size,
    color,
    opacity,
    scope,
    page: state.editor.currentPage
  });

  closeEditorWatermarkModal();
  showToast('Filigran PDF kaydına eklendi.');
}

// Mevcut PDF'ten Metin Çıkarıp Oluşturucuya Aktarma
async function extractTextToCreator() {
  if (!state.editor.pdfDoc) return;
  try {
    showToast('PDF metinleri taranıyor...');
    let fullText = '';

    for (let p = 1; p <= state.editor.pdfDoc.numPages; p++) {
      if (state.editor.deletedPages.has(p)) continue;
      const page = await state.editor.pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items.map(item => item.str).join(' ');
      fullText += (p > 1 ? '\n\n--- Sayfa Sonu ---\n\n' : '') + pageStr;
    }

    if (!fullText.trim()) {
      showToast('Belgede taranabilir metin bulunamadı.');
      return;
    }

    // Oluşturucu sekmesine aktar
    document.getElementById('creatorTextInput').value = fullText;
    updateWordCharCount();
    switchMode('creator');
    showToast('Metin başarıyla editöre aktarıldı!');
  } catch (err) {
    console.error('Metin çıkarma hatası:', err);
    showToast('Metin çıkarılırken hata oluştu.');
  }
}

// Düzenlenmiş PDF'i Kaydetme ve Tek Tıkla İndirme
async function saveAndDownloadEditedPdf() {
  if (!state.editor.rawBytes) return;

  try {
    showToast('Değişiklikler işleniyor...');
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
    
    // Orijinal PDF'i yükle
    const pdfDoc = await PDFDocument.load(state.editor.rawBytes);

    if (window.fontkit) {
      pdfDoc.registerFontkit(fontkit);
    }

    // Font yükleme
    let font;
    if (state.fontBytes) {
      font = await pdfDoc.embedFont(state.fontBytes);
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const hexToRgb = hex => {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      return rgb((num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255);
    };

    const canvas = document.getElementById('pdfRenderCanvas');
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    const totalPages = pdfDoc.getPageCount();

    // 1. Sayfa Rotasyonlarını Uygula
    for (let p = 1; p <= totalPages; p++) {
      const rot = state.editor.pageRotations[p];
      if (rot) {
        const page = pdfDoc.getPage(p - 1);
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + rot) % 360));
      }
    }

    // 2. Filigranları Ekle
    for (const wm of state.editor.watermarks) {
      const wmColor = hexToRgb(wm.color);
      const pagesToApply = wm.scope === 'all' 
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : [wm.page];

      for (const pNum of pagesToApply) {
        if (pNum > totalPages) continue;
        const page = pdfDoc.getPage(pNum - 1);
        const { width, height } = page.getSize();

        let wmWidth = 0;
        try {
          wmWidth = font.widthOfTextAtSize(wm.text, wm.size);
        } catch (e) {
          wmWidth = wm.text.length * (wm.size * 0.5);
        }

        page.drawText(wm.text, {
          x: width / 2 - (wmWidth / 2) * Math.cos(wm.angle * Math.PI / 180),
          y: height / 2 - (wmWidth / 2) * Math.sin(wm.angle * Math.PI / 180),
          size: wm.size,
          font: font,
          color: wmColor,
          opacity: wm.opacity,
          rotate: degrees(wm.angle)
        });
      }
    }

    // 3. Annotasyonları (Metin ve Karartma) Sayfaya Çiz
    for (let p = 1; p <= totalPages; p++) {
      const items = state.editor.annotations[p] || [];
      if (items.length === 0) continue;

      const page = pdfDoc.getPage(p - 1);
      const { width: pdfW, height: pdfH } = page.getSize();
      const scaleX = pdfW / canvasW;
      const scaleY = pdfH / canvasH;

      for (const item of items) {
        if (item.type === 'text' && item.text) {
          const pdfX = item.x * scaleX;
          // Canvas üstten başlar, PDF alttan başlar
          const pdfY = pdfH - (item.y * scaleY) - (item.fontSize * scaleY);
          const textColor = hexToRgb(item.color || '#000000');

          try {
            page.drawText(item.text, {
              x: pdfX,
              y: pdfY,
              size: item.fontSize * scaleY,
              font: font,
              color: textColor
            });
          } catch (e) {
            console.warn('Annotasyon metin çizilemedi:', e);
          }
        } else if (item.type === 'redact') {
          const pdfX = item.x * scaleX;
          const rectW = item.width * scaleX;
          const rectH = item.height * scaleY;
          const pdfY = pdfH - (item.y * scaleY) - rectH;

          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: rectW,
            height: rectH,
            color: hexToRgb(item.color || '#000000')
          });
        }
      }
    }

    // 4. Silinmiş Sayfaları Kaldır (Sondan başa doğru indis kaymaması için)
    const sortedDeleted = Array.from(state.editor.deletedPages).sort((a, b) => b - a);
    for (const delPage of sortedDeleted) {
      if (delPage <= pdfDoc.getPageCount() && pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(delPage - 1);
      }
    }

    const modifiedBytes = await pdfDoc.save();
    downloadBlob(modifiedBytes, 'duzenlenmis_belge.pdf');
    showToast('"duzenlenmis_belge.pdf" başarıyla indirildi!');
  } catch (err) {
    console.error('Düzenlenmiş PDF kaydetme hatası:', err);
    showToast('PDF kaydedilirken hata oluştu.');
  }
}

// ----------------------------------------------------
// Yardımcı Fonksiyonlar (İndirme & Toast)
// ----------------------------------------------------
function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function showToast(message) {
  const toast = document.getElementById('toastMessage');
  toast.innerText = message;
  toast.style.display = 'block';
  
  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 2800);
}
