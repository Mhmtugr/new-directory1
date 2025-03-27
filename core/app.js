/**
 * app.js 
 * Tüm uygulamayı başlatan ve script yükleme işlemini yöneten ana script
 */

// Global değişkenler ve yapılandırma
const CONFIG = {
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isDemo: window.location.hostname.includes('netlify.app') || window.location.search.includes('demo=true'),
    firebaseSDKVersion: '9.22.0',
    scriptLoadTimeout: 20000 // 20 saniye
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log("ElektroTrack uygulaması başlatılıyor...");
    
    // Uygulama başlatma durumunu takip etmek için global değişken
    window.appState = {
        isLoading: true,
        scriptsLoaded: false,
        firebaseInitialized: false,
        authInitialized: false
    };
    
    // Yükleme göstergesi ekle
    showInitialLoadingIndicator();
    
    // Uygulamayı başlat
    initializeApplication()
        .then(() => {
            console.log("Uygulama başarıyla başlatıldı");
            hideInitialLoadingIndicator();
            window.appState.isLoading = false;
        })
        .catch(error => {
            console.error("Uygulama başlatma hatası:", error);
            showLoadingError(error);
            window.appState.isLoading = false;
            
            // Demo moda geç
            if (!CONFIG.isDemo) {
                promptForDemoMode(error);
            }
        });
});

/**
 * Uygulamayı başlat
 */
async function initializeApplication() {
    try {
        // Demo mod kontrolü
        if (CONFIG.isDemo) {
            console.log("Demo mod tespit edildi. Ona göre yapılandırılıyor...");
            
            // Demo modu bildirimi göster
            showDemoModeNotification();
            
            // Mock Firebase ve diğer bağımlılıkları yükle
            await loadScript('js/mock-firebase.js');
        } else {
            console.log("Normal mod. Firebase ve bağımlılıkları yükleniyor...");
        }
        
        // Uyumluluk kontrolü ve diğer bağımlılıkları yükle
        await loadScript('js/compat-check.js');
        
        // Firebase SDK'yı CDN'den yükle
        if (!CONFIG.isDemo && !window.firebase) {
            await loadFirebaseSDK();
        }
        
        // Ana yapılandırma ve bileşenleri yükle
        await loadScript('js/firebase-config.js');
        await loadScript('js/main.js');
        await loadScript('js/auth.js');
        
        // Fonksiyonel bileşenleri paralel olarak yükle
        await Promise.all([
            loadScript('js/dashboard.js'),
            loadScript('js/orders.js'),
            loadScript('js/purchasing.js'),
            loadScript('js/production.js')
        ]);
        
        // İkincil bileşenleri paralel olarak yükle
        await Promise.all([
            loadScript('js/chatbot.js'),
            loadScript('js/ai-analytics.js'),
            loadScript('js/data-viz.js')
        ]);
        
        // Scriptlerin yüklenme durumunu güncelle
        window.appState.scriptsLoaded = true;
        console.log('Tüm scriptler başarıyla yüklendi');
        
        // Firebase kitaplığının yüklendiğini kontrol et
        if (!window.firebase && !CONFIG.isDemo) {
            throw new Error("Firebase kitaplığı bulunamadı");
        }
        
        // Ana uygulamayı başlat
        return startApp();
    } catch (error) {
        console.error('Uygulama başlatma hatası:', error);
        
        // Demo moda geçiş yapıp tekrar deneyelim
        if (!CONFIG.isDemo) {
            console.warn('Demo moda geçiliyor...');
            CONFIG.isDemo = true;
            showDemoModeNotification();
            return initializeApplication();
        }
        
        throw error;
    }
}

/**
 * Ana uygulamayı başlat (scriptler yüklendikten sonra)
 */
async function startApp() {
    try {
        // InitApp fonksiyonu var mı kontrolü
        if (typeof initApp === 'function') {
            console.log("initApp fonksiyonu bulundu ve çağrılıyor...");
            return initApp();
        } else {
            console.warn('initApp fonksiyonu bulunamadı, alternatif başlatma yapılıyor...');
            
            // Demo mod için manuel giriş
            if (CONFIG.isDemo) {
                if (typeof demoLogin === 'function') {
                    demoLogin();
                } else {
                    // demoLogin yoksa basit bir yerine koyma oluşturalım
                    window.currentUser = {
                        uid: 'demo-user-1',
                        email: 'demo@elektrotrack.com',
                        displayName: 'Demo Kullanıcı'
                    };
                }
                
                // Ana uygulamayı göster
                showMainApp();
                
                // Dashboard verilerini yükle
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                } else if (typeof loadDashboardDataKOD1 === 'function') {
                    loadDashboardDataKOD1();
                } else if (typeof loadDashboardDataKOD2 === 'function') {
                    loadDashboardDataKOD2();
                }
            } else {
                // Firebase ile otomatik kimlik doğrulama dinleyicisi ekle
                if (window.firebase && window.firebase.auth) {
                    window.firebase.auth().onAuthStateChanged(user => {
                        if (user) {
                            console.log("Kullanıcı oturum açmış:", user.email);
                            window.currentUser = user;
                            showMainApp();
                            
                            // Dashboard verilerini yükle
                            if (typeof loadDashboardData === 'function') {
                                loadDashboardData();
                            } else if (typeof loadDashboardDataKOD1 === 'function') {
                                loadDashboardDataKOD1();
                            } else if (typeof loadDashboardDataKOD2 === 'function') {
                                loadDashboardDataKOD2();
                            }
                        } else {
                            console.log("Kullanıcı oturum açmamış, login sayfası gösteriliyor");
                            showLogin();
                        }
                    });
                } else {
                    // Firebase yok - demo moda geç
                    console.warn("Firebase bulunamadı, demo moda geçiliyor");
                    CONFIG.isDemo = true;
                    showDemoModeNotification();
                    return startApp();
                }
            }
        }
    } catch (error) {
        console.error("Uygulama başlatma hatası:", error);
        throw error;
    }
}

/**
 * Firebase SDK'yı CDN üzerinden yükle
 */
async function loadFirebaseSDK() {
    try {
        // Firebase modullerini sırayla yükleme
        console.log("Firebase SDK yükleniyor...");
        
        const modules = [
            'app-compat',
            'auth-compat',
            'firestore-compat',
            'analytics-compat'
        ];
        
        // Tüm modülleri paralel olarak yükle
        await Promise.all(modules.map(module => 
            loadExternalScript(`https://www.gstatic.com/firebasejs/${CONFIG.firebaseSDKVersion}/firebase-${module}.js`)
        ));
        
        console.log("Firebase SDK başarıyla yüklendi");
        return true;
    } catch (error) {
        console.error("Firebase SDK yüklenirken hata oluştu:", error);
        throw error;
    }
}

/**
 * JavaScript dosyası yükleme fonksiyonu (lokal)
 */
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script yükleme hatası: ${url}`));
        
        document.head.appendChild(script);
    });
}

/**
 * Harici JavaScript dosyası yükleme fonksiyonu (CDN)
 */
function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
        console.log(`Harici script yükleniyor: ${url}`);
        
        // Daha önce yüklenmiş mi kontrol et
        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
            console.log(`Harici script zaten yüklenmiş: ${url}`);
            return resolve();
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        
        // Zaman aşımı mekanizması ekle
        const timeoutId = setTimeout(() => {
            if (!script.loaded) {
                script.onerror = null;
                script.onload = null;
                reject(new Error(`Harici script yükleme zaman aşımı: ${url}`));
            }
        }, CONFIG.scriptLoadTimeout);
        
        script.onload = () => {
            script.loaded = true;
            clearTimeout(timeoutId);
            console.log(`Harici script başarıyla yüklendi: ${url}`);
            resolve();
        };
        
        script.onerror = (error) => {
            script.loaded = true;
            clearTimeout(timeoutId);
            console.error(`Harici script yüklenirken hata: ${url}`, error);
            reject(new Error(`Harici script yüklenemedi: ${url}`));
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Başlangıç yükleme göstergesini ekle
 */
function showInitialLoadingIndicator() {
    // Mevcut yükleme göstergesi var mı kontrol et
    if (document.getElementById('initial-loading')) {
        return;
    }
    
    const loadingElement = document.createElement('div');
    loadingElement.id = 'initial-loading';
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '0';
    loadingElement.style.left = '0';
    loadingElement.style.width = '100%';
    loadingElement.style.height = '100%';
    loadingElement.style.backgroundColor = '#f8fafc';
    loadingElement.style.display = 'flex';
    loadingElement.style.flexDirection = 'column';
    loadingElement.style.alignItems = 'center';
    loadingElement.style.justifyContent = 'center';
    loadingElement.style.zIndex = '9999';
    
    loadingElement.innerHTML = `
        <div style="background-color: #1e40af; width: 80px; height: 80px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;">
            <i class="fas fa-bolt" style="color: white; font-size: 2.5rem;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">ElektroTrack</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 2rem;">Orta Gerilim Hücre İmalat Takip Sistemi</div>
        <div style="display: flex; flex-direction: column; align-items: center;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(30, 64, 175, 0.2); border-top-color: #1e40af; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="margin-top: 1rem; color: #64748b; font-size: 0.875rem;" id="loading-message">Uygulama yükleniyor...</div>
        </div>
    `;
    
    // Animasyon için CSS ekle
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loadingElement);
    
    // Font Awesome var mı kontrol et (yükleme animasyonu için gerekli)
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fontAwesome);
    }
}

/**
 * Başlangıç yükleme göstergesini kaldır
 */
function hideInitialLoadingIndicator() {
    const loadingElement = document.getElementById('initial-loading');
    if (loadingElement) {
        // Yumuşak geçiş için animasyon ekle
        loadingElement.style.transition = 'opacity 0.5s ease';
        loadingElement.style.opacity = '0';
        
        // Animasyondan sonra elementi kaldır
        setTimeout(() => {
            loadingElement.remove();
        }, 500);
    }
}

/**
 * Yükleme hatası göster
 */
function showLoadingError(error) {
    const loadingElement = document.getElementById('initial-loading');
    if (loadingElement) {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = `Hata: ${error.message || 'Uygulama başlatılamadı'}`;
            loadingMessage.style.color = '#ef4444';
        }
        
        // Yükleme animasyonunu hata animasyonuna çevir
        const loadingSpinner = loadingElement.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.borderColor = '#ef4444';
            loadingSpinner.style.borderTopColor = '#ef4444';
            loadingSpinner.style.animation = 'none';
            
            // Hata simgesi ekle
            loadingSpinner.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 2rem;"></i>';
        }
        
        // Demo moda geçiş butonu ekle
        const actionsContainer = document.createElement('div');
        actionsContainer.style.marginTop = '2rem';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.gap = '1rem';
        
        actionsContainer.innerHTML = `
            <button id="retry-button" style="background-color: #1e40af; color: white; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-sync-alt"></i> Tekrar Dene
            </button>
            <button id="demo-button" style="background-color: #10b981; color: white; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-play"></i> Demo Moda Geç
            </button>
        `;
        
        loadingElement.appendChild(actionsContainer);
        
        // Butonlara olay dinleyicileri ekle
        document.getElementById('retry-button').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('demo-button').addEventListener('click', () => {
            enableDemoMode();
        });
    }
}

/**
 * Demo modu bildirimini göster
 */
function showDemoModeNotification() {
    const demoModeNotification = document.getElementById('demo-mode-notification');
    if (demoModeNotification) {
        demoModeNotification.style.display = 'block';
    } else {
        // Bildirim elementi yoksa oluştur (app.js'in diğer scriptlerden önce yüklendiği durumlar için)
        const notification = document.createElement('div');
        notification.id = 'demo-mode-notification';
        notification.className = 'info-box warning';
        notification.style.position = 'fixed';
        notification.style.bottom = '10px';
        notification.style.left = '10px';
        notification.style.width = 'auto';
        notification.style.zIndex = '1000';
        
        notification.innerHTML = `
            <div class="info-box-title">Demo Modu</div>
            <div class="info-box-content">
                <p>Uygulama şu anda demo modunda çalışıyor. Firebase kimlik doğrulaması atlanıyor.</p>
                <button class="btn btn-sm btn-warning" onclick="document.getElementById('demo-mode-notification').style.display = 'none';">
                    <i class="fas fa-times"></i> Kapat
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
    }
}

/**
 * Demo moduna geçiş için kullanıcıya sor
 */
function promptForDemoMode(error) {
    const shouldEnableDemo = confirm(
        `Uygulama başlatılırken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}\n\n` +
        `Demo modunda devam etmek ister misiniz?`
    );
    
    if (shouldEnableDemo) {
        enableDemoMode();
    }
}

/**
 * Demo modunu etkinleştir
 */
function enableDemoMode() {
    console.log("Demo modu etkinleştiriliyor...");
    
    // Demo modunu etkinleştir
    CONFIG.isDemo = true;
    
    // Yükleme göstergesini güncelle ve kaldır
    const loadingElement = document.getElementById('initial-loading');
    if (loadingElement) {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = 'Demo moduna geçiliyor...';
            loadingMessage.style.color = '#10b981';
        }
        
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 1000);
    }
    
    // Demo bildirimini göster
    showDemoModeNotification();
    
    // Kullanıcı bilgilerini ayarla
    window.currentUser = {
        uid: 'demo-user-1',
        email: 'demo@mehmetendustriyeltakip.com',
        displayName: 'Demo Kullanıcı'
    };
    
    try {
        // Tüm login sayfalarını gizle
        const loginPage = document.getElementById('login-page');
        if (loginPage) {
            loginPage.style.display = 'none';
        }
        
        // Ana uygulamayı göster
        const mainApp = document.getElementById('main-app');
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        
        if (mainApp) {
            mainApp.style.display = 'block';
        } 
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        if (sidebar) {
            sidebar.style.display = 'block';
        }
        
        // Dashboard'ı göster
        const dashboardTab = document.querySelector('a[href="#dashboard"]');
        if (dashboardTab) {
            dashboardTab.click();
        }
        
        // Dashboard verilerini yükle (varsa)
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        
        // UI'ı tekrar hazırla
        if (typeof setupUI === 'function') {
            setupUI();
        }
        
        // Sayfa yüklendiği olayını tetikle
        document.dispatchEvent(new Event('appReady'));
        
        console.log("Demo modu başarıyla etkinleştirildi");
        return true;
    } catch (error) {
        console.error("Demo modu etkinleştirilirken hata:", error);
        
        // Yine de ana uygulamayı göstermeye çalış
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        return false;
    }
}

/**
 * Yardımcı fonksiyonlar
 */

// Ana uygulamayı göster (login sayfasını gizle)
function showMainApp() {
    // Tüm login sayfalarını gizle
    const loginPages = [
        document.getElementById('login-page'), 
        document.getElementById('register-page'), 
        document.getElementById('forgot-password-page')
    ];
    
    loginPages.forEach(page => {
        if (page) page.style.display = 'none';
    });
    
    // Yükleme göstergesini gizle
    hideInitialLoadingIndicator();
    
    // Ana uygulamayı göster
    const mainApp = document.getElementById('main-app');
    if (mainApp) {
        mainApp.style.display = 'block';
    } else {
        // main-app bulunamadı, .main-content veya .sidebar elementlerini aramayı dene
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
        }
        
        // İlk dashboard sayfasını göster
        const dashboardPage = document.getElementById('dashboard-page') || document.querySelector('[data-page="dashboard"]');
        if (dashboardPage) {
            dashboardPage.style.display = 'block';
        }
    }
    
    // İlgili event'i tetikle
    const event = new CustomEvent('appReady');
    document.dispatchEvent(event);
}

// Login sayfasını göster (varsa)
function showLogin() {
    try {
        // Ana uygulamayı gizle
        const mainApp = document.getElementById('main-app') || document.querySelector('.main-content');
        if (mainApp) {
            mainApp.style.display = 'none';
        }
        
        // Yükleme göstergesini kaldır
        hideInitialLoadingIndicator();
        
        // Login sayfasını göster
        const loginPage = document.getElementById('login-page');
        if (loginPage) {
            loginPage.style.display = 'flex';
        } else {
            // Login sayfası yoksa, basit bir login formu oluştur
            const container = document.createElement('div');
            container.id = 'login-page';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.minHeight = '100vh';
            container.style.backgroundColor = '#f8fafc';
            
            container.innerHTML = `
                <div style="max-width: 400px; width: 100%; padding: 2rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 1.5rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">MehmetEndüstriyelTakip</div>
                        <div style="font-size: 0.875rem; color: #64748b;">Orta Gerilim Hücre İmalat Takip Sistemi</div>
                    </div>
                    
                    <form id="login-form" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <label for="email" style="font-size: 0.875rem; font-weight: 500; color: #334155;">E-posta</label>
                            <input type="email" id="email" placeholder="E-posta adresiniz" style="padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem;">
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <label for="password" style="font-size: 0.875rem; font-weight: 500; color: #334155;">Parola</label>
                            <input type="password" id="password" placeholder="Parolanız" style="padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem;">
                        </div>
                        
                        <button type="button" id="login-button" style="margin-top: 1rem; padding: 0.75rem 1rem; background-color: #1e40af; color: white; border: none; border-radius: 0.25rem; font-weight: 500; cursor: pointer;">Giriş Yap</button>
                        
                        <div style="text-align: center; margin-top: 1rem;">
                            <a href="#" id="demo-mode-button" style="color: #1e40af; text-decoration: none; font-size: 0.875rem;">Demo modunda devam et</a>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(container);
            
            // Login butonunu etkinleştir
            const loginButton = document.getElementById('login-button');
            if (loginButton) {
                loginButton.addEventListener('click', function() {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    if (email && password) {
                        // Gerçek uygulamada Firebase ile login işlemi
                        if (window.firebase && window.firebase.auth) {
                            window.firebase.auth().signInWithEmailAndPassword(email, password)
                                .then((userCredential) => {
                                    // Login başarılı
                                    window.currentUser = userCredential.user;
                                    showMainApp();
                                })
                                .catch((error) => {
                                    alert(`Giriş yapılamadı: ${error.message}`);
                                });
                        } else {
                            // Firebase yoksa demo moda geç
                            enableDemoMode();
                        }
                    } else {
                        alert('Lütfen e-posta ve parola alanlarını doldurunuz.');
                    }
                });
            }
            
            // Demo modu butonunu etkinleştir
            const demoButton = document.getElementById('demo-mode-button');
            if (demoButton) {
                demoButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    enableDemoMode();
                });
            }
        }
        
        // Enter tuşuyla form gönderimi
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') {
                const loginButton = document.getElementById('login-button');
                if (loginButton) {
                    loginButton.click();
                }
            }
        });
    } catch (error) {
        console.error("Login sayfası gösterilirken hata:", error);
        // Hata durumunda demo moda geç
        enableDemoMode();
    }
}

// Uygulama önyükleme ve başlatma kodu
async function initApp() {
    console.log("Uygulama başlatılıyor...");
    
    try {
        // Temel kütüphaneleri yükle
        await loadDependencies().catch(err => {
            console.error("Bağımlılıklar yüklenirken hata:", err);
            // Bağımlılıklar yüklenemese bile devam et
        });
        
        // Modülleri yükle
        try {
            await loadModules();
        } catch (moduleError) {
            console.error("Modüller yüklenirken hata:", moduleError);
            // Modüller yüklenemese bile devam et
        }
        
        // UI'ı hazırla
        setupUI();
        
        // Verileri yükle
        try {
            await loadInitialData();
        } catch (dataError) {
            console.error("Veriler yüklenirken hata:", dataError);
            // Veri hataları kritik değil, devam et
        }
        
        // Ana uygulamayı göster
        showMainApp();
        
        console.log("Uygulama başarıyla yüklendi.");
        return true;
    } catch (error) {
        console.error("Uygulama başlatma hatası:", error);
        showErrorPage(error);
        
        // Otomatik olarak 3 saniye sonra demo moda geç
        setTimeout(() => {
            enableDemoMode();
        }, 3000);
        
        return false;
    }
}

// Bağımlılıkları yükle
async function loadDependencies() {
    try {
        console.log("Temel bağımlılıklar yükleniyor...");
        
        // Mock veritabanı hizmetlerini yükle (gerçek uygulamada gerek olmayabilir)
        if (!window.firebase) {
            await loadScript('core/mock-firebase.js');
        }
        
        // Uyumluluk kontrolü
        if (!await checkCompatibility()) {
            throw new Error("Tarayıcı uyumsuzluğu: Tarayıcınız uygulamanın gerektirdiği özellikleri desteklemiyor.");
        }
        
        // Temel hizmetleri yükle
        return true;
    } catch (error) {
        console.error("Bağımlılıklar yüklenirken hata:", error);
        throw error;
    }
}

// UI modüllerini yükle
async function loadModules() {
    try {
        console.log("Modüller yükleniyor...");
        
        // Herhangi bir eksik modülü yükle
        const missingModules = [];
        
        // Dashboard modülü kontrolü
        if (typeof window.loadDashboardData !== 'function') {
            if (document.querySelector('script[src*="dashboard.js"]')) {
                console.log("Dashboard modülü script etiketi var ancak yüklenemedi");
            } else {
                console.log("Dashboard modülü script etiketi bulunamadı, ekleniyor");
                missingModules.push(loadScript('modules/dashboard/dashboard.js'));
            }
        }
        
        // Orders modülü kontrolü
        if (typeof window.loadOrdersData !== 'function') {
            if (document.querySelector('script[src*="orders.js"]')) {
                console.log("Orders modülü script etiketi var ancak yüklenemedi");
            } else {
                console.log("Orders modülü script etiketi bulunamadı, ekleniyor");
                missingModules.push(loadScript('modules/orders/orders.js'));
            }
        }
        
        // Tüm eksik modüllerin yüklenmesini bekle
        if (missingModules.length > 0) {
            await Promise.all(missingModules);
        }
        
        return true;
    } catch (error) {
        console.error("Modüller yüklenirken hata:", error);
        console.log("Hata oluştu ancak demo mod ile devam edilecek");
        return true; // Hata olsa bile devam et
    }
}

// Uyumluluk kontrolü
async function checkCompatibility() {
    // Temel uyumluluk kontrolü
    if (!window.localStorage || !window.indexedDB || !window.fetch) {
        return false;
    }
    
    // PWA desteği kontrolü
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker başarıyla kaydedildi');
        } catch (error) {
            console.warn('Service Worker kaydı başarısız:', error);
            // Service worker hatası uygulamayı engellemez
        }
    }
    
    return true;
}

// Hata sayfası göster
function showErrorPage(error) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="error-container">
            <div class="error-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h2>Uygulama Başlatılamadı</h2>
            <p>${error.message || 'Bilinmeyen bir hata oluştu.'}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Yeniden Dene</button>
        </div>
    `;
}

// UI kurulumu 
function setupUI() {
    // Sidebar menü işlevselliği
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Aktif link sınıfını güncelle
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // İlgili içeriği göster (basit bir router)
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                document.querySelectorAll('.page-content').forEach(page => {
                    page.style.display = 'none';
                });
                
                const targetPage = document.getElementById(targetId);
                if (targetPage) {
                    targetPage.style.display = 'block';
                }
            }
        });
    });
    
    // İlk sayfa olarak gösterge panelini göster
    const dashboardLink = document.querySelector('.sidebar .nav-link[data-target="dashboard-page"]');
    if (dashboardLink) {
        dashboardLink.click();
    }
}

// Uygulamayı başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

export { loadScript };

// Verileri yükle
async function loadInitialData() {
    try {
        console.log("Başlangıç verileri yükleniyor...");
        
        // Dashboard için verileri yükle
        if (typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
        }
        
        // Sipariş verilerini yükle
        if (typeof window.loadOrdersData === 'function') {
            await window.loadOrdersData();
        }
        
        // Üretim verilerini yükle
        if (typeof window.loadProductionData === 'function') {
            await window.loadProductionData();
        }
        
        return true;
    } catch (error) {
        console.error("Veriler yüklenirken hata:", error);
        // Kritik bir hata değilse devam et
        return true;
    }
}