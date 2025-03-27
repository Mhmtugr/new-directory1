 /**
 * Firebase Uyumluluk Kontrolü
 * Bu script, Firebase SDK'larının düzgün yüklenip yüklenmediğini kontrol eder.
 */

function checkFirebaseCompatibility() {
    // Firebase tanımlı mı kontrol et
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK yüklenemedi. İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.');
      showErrorMessage('Firebase SDK yüklenemedi. İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.');
      return false;
    }
  
    // Gerekli modülleri kontrol et
    const requiredServices = [
      { name: 'auth', displayName: 'Firebase Authentication' },
      { name: 'firestore', displayName: 'Firestore' }
    ];
  
    let allServicesLoaded = true;
    let missingServices = [];
  
    for (const service of requiredServices) {
      if (typeof firebase[service.name] === 'undefined') {
        console.error(`${service.displayName} yüklenemedi.`);
        allServicesLoaded = false;
        missingServices.push(service.displayName);
      }
    }
  
    if (!allServicesLoaded) {
      showErrorMessage(`Bazı Firebase bileşenleri yüklenemedi (${missingServices.join(', ')}). Demo moda geçiş yapılıyor...`);
      
      // Demo moduna geçiş için biraz bekle ve sonra sayfayı yönlendir
      setTimeout(() => {
        enableDemoMode();
      }, 2000);
      
      return false;
    }
  
    return true;
  }
  
  // Demo modunu etkinleştir
  function enableDemoMode() {
    console.log("Demo modu etkinleştiriliyor...");
    
    // URL'e demo parametresini ekle
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('demo')) {
      currentUrl.searchParams.set('demo', 'true');
      window.location.href = currentUrl.toString();
    } else {
      // Hata mesajını kaldır çünkü zaten demo moddayız
      const errorBox = document.getElementById('firebase-error');
      if (errorBox) {
        errorBox.remove();
      }
    }
  }
  
  // Hata mesajını kullanıcıya göster
  function showErrorMessage(message) {
    // Demo modunda mıyız kontrol et
    const isDemo = window.location.search.includes('demo=true');
    if (isDemo) {
      console.log("Demo modunda çalışılıyor, hata mesajı gösterilmiyor.");
      return;
    }
    
    // Sayfa yüklendiyse hata mesajı göster
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Var olan hata kutusu varsa sil
      const existingError = document.getElementById('firebase-error');
      if (existingError) {
        existingError.remove();
      }
      
      // Yeni hata kutusu oluştur
      const errorBox = document.createElement('div');
      errorBox.id = 'firebase-error';
      errorBox.style.position = 'fixed';
      errorBox.style.top = '0';
      errorBox.style.left = '0';
      errorBox.style.right = '0';
      errorBox.style.backgroundColor = '#f8d7da';
      errorBox.style.color = '#721c24';
      errorBox.style.padding = '12px';
      errorBox.style.textAlign = 'center';
      errorBox.style.zIndex = '9999';
      errorBox.style.fontWeight = 'bold';
      errorBox.innerHTML = `
        <div>${message}</div>
        <div style="margin-top:8px;">
          <button onclick="location.reload()" style="margin-right:8px;padding:5px 10px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">Sayfayı Yenile</button>
          <button onclick="enableDemoMode()" style="padding:5px 10px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">Demo Modunda Çalıştır</button>
        </div>
      `;
      
      document.body.prepend(errorBox);
    } else {
      // Sayfa yüklenmedi, event listener ekle
      window.addEventListener('DOMContentLoaded', () => {
        showErrorMessage(message);
      });
    }
  }
  
  // Firebase SDK kontrolü için yüklenme kontrolü
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      // Sayfa yüklendikten 2 saniye sonra kontrol et (tüm script'lerin yüklenmesi için)
      checkFirebaseCompatibility();
    }, 2000);
  });