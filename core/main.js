 /**
 * main.js
 * Uygulama ana işlevleri, sayfa kontrolü ve yardımcı fonksiyonlar
 */

// Global durum değişkenleri
const appState = {
    currentPage: 'dashboard',
    isUserLoggedIn: false,
    currentUser: null,
    theme: localStorage.getItem('theme') || 'light',
    language: localStorage.getItem('language') || 'tr',
    isLoading: false,
    notifications: localStorage.getItem('notifications') === 'true',
    lastError: null,
    isDemoMode: window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('netlify.app') ||
                window.location.search.includes('demo=true')
};

// Sayfa yükleme durumları
const pageLoadStatus = {};

/**
 * Uygulama başlatma işlevi
 */
function initApp() {
    console.log("ElektroTrack uygulaması başlatılıyor...");
    
    // Demo modu kontrolü ve bildirimi
    if (appState.isDemoMode) {
        console.log("Demo modu tespit edildi");
        const demoModeNotification = document.getElementById('demo-mode-notification');
        if (demoModeNotification) {
            demoModeNotification.style.display = 'block';
        }
    }
    
    // Tema ayarlarını uygula
    applyTheme(appState.theme);
    
    // Service worker kaydı (PWA desteği için)
    registerServiceWorker();
    
    // URL'den sayfa yönlendirmesini kontrol et
    handleURLRouting();
    
    // Sayfa olay dinleyicilerini ayarla
    setupEventListeners();
    
    // Kullanıcı oturum durumu kontrolü
    checkUserAuthentication();
}

/**
 * Kullanıcı kimlik doğrulama durumunu kontrol et
 */
function checkUserAuthentication() {
    // Firebase Auth kontrolü
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(handleAuthStateChanged);
    } else if (appState.isDemoMode) {
        // Demo modunda otomatik giriş
        console.log("Firebase Auth yok, demo mod otomatik giriş yapılıyor");
        demoLogin();
    } else {
        console.warn("Firebase Auth bulunamadı ve demo mod aktif değil");
        showLogin();
    }
}

/**
 * Kullanıcı oturum durumu değişikliği işleyicisi
 * @param {Object} user - Firebase kullanıcı objesi (null ise oturum kapalı)
 */
function handleAuthStateChanged(user) {
    if (user) {
        // Kullanıcı giriş yapmış
        appState.isUserLoggedIn = true;
        appState.currentUser = user;
        
        console.log("Kullanıcı oturum açtı:", user.email);
        
        // Kullanıcı bilgilerini Firestore'dan al
        if (typeof loadUserData === 'function') {
            loadUserData(user.uid).catch(error => {
                console.warn("Kullanıcı bilgileri yüklenemedi:", error);
            });
        }
        
        // Ana uygulamayı göster
        showMainApp();
        
        // Sayfa yönlendirmesi
        if (appState.currentPage) {
            showPage(appState.currentPage);
        } else {
            showPage('dashboard');
        }
    } else {
        // Kullanıcı çıkış yapmış veya giriş yapmamış
        appState.isUserLoggedIn = false;
        appState.currentUser = null;
        
        // Demo modunda otomatik giriş yap
        if (appState.isDemoMode) {
            console.log("Demo mod aktif, otomatik giriş yapılıyor");
            demoLogin();
        } else {
            // Normal modda giriş sayfasını göster
            showLogin();
        }
    }
}

/**
 * URL'den sayfa yönlendirmesini kontrol et
 */
function handleURLRouting() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const pageName = hash.substring(1);
        appState.currentPage = pageName;
        // Auth kontrol edildikten sonra doğru sayfa yüklenecek
    }
}

/**
 * Tüm sayfa ve arayüz olay dinleyicilerini ayarla
 */
function setupEventListeners() {
    // Navigasyon menü öğeleri
    document.querySelectorAll('.navbar-item').forEach(item => {
        item.addEventListener('click', function(event) {
            // İçeriği al ve lowercase yap
            const pageId = this.textContent.trim().toLowerCase();
            if (pageId) {
                showPage(pageId);
                // Tıklama olayını durdur (showPage zaten çağrılıyor)
                event.preventDefault();
            }
        });
    });
    
    // Kullanıcı menüsü
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', toggleUserMenu);
    }
    
    // Modal kapatma butonları
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modalId = this.closest('.modal').id;
            closeModal(modalId);
        });
    });
    
    // Tab içerikleri
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabContentId = this.getAttribute('data-tab');
            switchTab(tabContentId);
        });
    });
    
    // Tüm form eklentileri
    setupFormEventListeners();
    
    // URL hash değişikliğini dinle
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const pageName = hash.substring(1);
            showPage(pageName);
        }
    });
    
    // Arama filtresi
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            // İlgili filtre fonksiyonunu çağır
            if (appState.currentPage === 'dashboard' || appState.currentPage === 'orders') {
                if (typeof filterOrders === 'function') {
                    filterOrders();
                }
            } else if (appState.currentPage === 'stock') {
                if (typeof filterStock === 'function') {
                    filterStock();
                }
            } else if (appState.currentPage === 'customers') {
                if (typeof filterCustomers === 'function') {
                    filterCustomers();
                }
            }
        });
    }
    
    // Chatbot input için Enter tuşu
    const chatInput = document.getElementById('chatbot-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Sayfa dışına tıklandığında dropdown ve modalları kapat
    document.addEventListener('click', function(event) {
        // Dropdown kontrolü
        if (!event.target.matches('.user-avatar') && !event.target.closest('.user-dropdown')) {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown && dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            }
        }
        
        // Modal kontrolü - modal arka planına tıklandığında
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
    
    // Escape tuşu ile modalları kapat
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    closeModal(modal.id);
                }
            });
        }
    });
    
    // Ayarlar form olayları
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // Yenile butonu
    const refreshBtn = document.querySelector('.page-header .btn-outline');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
}

/**
 * Form olay dinleyicilerini ayarla
 */
function setupFormEventListeners() {
    // Giriş formu
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof login === 'function') {
                login();
            } else {
                console.warn("Login fonksiyonu bulunamadı");
                demoLogin();
            }
        });
    }
    
    // Kayıt formu
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof register === 'function') {
                register();
            } else {
                console.warn("Register fonksiyonu bulunamadı");
                showToast('Kayıt işlemi şu anda kullanılamıyor', 'error');
            }
        });
    }
    
    // Şifre sıfırlama formu
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof resetPassword === 'function') {
                resetPassword();
            } else {
                console.warn("resetPassword fonksiyonu bulunamadı");
                showToast('Şifre sıfırlama işlemi şu anda kullanılamıyor', 'error');
            }
        });
    }
    
    // Sipariş oluşturma formu
    const createOrderForm = document.getElementById('create-order-form');
    if (createOrderForm) {
        createOrderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (typeof createOrder === 'function') {
                // Form verilerini topla
                const formData = new FormData(this);
                const orderData = {
                    customer: formData.get('customer'),
                    cellType: formData.get('cellType'),
                    cellCount: parseInt(formData.get('cellCount')) || 0,
                    orderDate: formData.get('orderDate') ? new Date(formData.get('orderDate')) : new Date(),
                    deliveryDate: formData.get('deliveryDate') ? new Date(formData.get('deliveryDate')) : null,
                    status: formData.get('status') || 'planning',
                    description: formData.get('description') || ''
                };
                
                createOrder(orderData);
            } else {
                console.warn("createOrder fonksiyonu bulunamadı");
                closeModal('create-order-modal');
                showToast('Sipariş oluşturma işlemi şu anda kullanılamıyor', 'error');
            }
        });
    }
}

/**
 * Uygulamadaki sayfa içeriklerini göster/gizle
 * @param {string} pageName - Gösterilecek sayfa adı
 */
function showPage(pageName) {
    // Gereksiz boşlukları temizle
    pageName = pageName.trim().toLowerCase();
    
    // Arama için doğru sayfa adını belirle
    const pageMap = {
        'kontrol paneli': 'dashboard',
        'sipariş': 'orders',
        'siparişler': 'orders',
        'müşteriler': 'customers',
        'malzemeler': 'stock',
        'stok': 'stock',
        'satınalma': 'purchasing',
        'satın alma': 'purchasing',
        'üretim': 'production',
        'raporlar': 'reports',
        'ayarlar': 'settings',
        'profil': 'profile',
        'notlar': 'notes',
        'yapay zeka': 'ai'
    };
    
    // Sayfa adını düzelt
    if (pageMap[pageName]) {
        pageName = pageMap[pageName];
    }
    
    // Sayfaları gizle
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // İstenen sayfayı göster
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = pageName;
        
        // Sayfa başlığı ve URL'yi güncelle
        document.title = `ElektroTrack - ${getPageTitle(pageName)}`;
        history.pushState({ page: pageName }, document.title, `#${pageName}`);
        
        // Sayfa görünürlük değişikliği olayını tetikle
        dispatchPageChangeEvent(pageName);
    } else {
        console.warn(`Sayfa bulunamadı: ${pageName}`);
        // Sayfa bulunamadıysa dashboard'a yönlendir
        if (pageName !== 'dashboard') {
            showPage('dashboard');
            return;
        }
    }
    
    // Menü öğelerini güncelle
    const menuItems = document.querySelectorAll('.navbar-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        
        // Sayfa adına göre menü öğesini bul
        if (item.textContent.trim().toLowerCase() === pageName.toLowerCase() ||
            (pageMap[item.textContent.trim().toLowerCase()] === pageName)) {
            item.classList.add('active');
        }
    });
    
    // Sayfa özel içeriklerini yükle
    loadPageContent(pageName);
}

/**
 * Sayfa içeriğini yükle
 * @param {string} pageName - Sayfa adı
 */
function loadPageContent(pageName) {
    console.log(`${pageName} sayfası yükleniyor...`);
    
    // Sayfa daha önce yüklendi mi kontrol et
    if (pageLoadStatus[pageName]) {
        console.log(`${pageName} sayfası zaten yüklendi, yenilenmeyecek`);
        return;
    }
    
    switch (pageName) {
        case 'dashboard':
            showLoadingInPage('dashboard-page');
            pageLoadStatus[pageName] = true;
            
            // Dashboard verilerini yükle
            if (typeof loadDashboardData === 'function') {
                loadDashboardData().catch(error => {
                    console.error("Dashboard verileri yüklenirken hata:", error);
                    showErrorInPage('dashboard-page', 'Dashboard verileri yüklenemedi', error.message);
                });
            } else if (typeof loadDashboardDataKOD1 === 'function') {
                loadDashboardDataKOD1().catch(error => {
                    console.error("Dashboard verileri yüklenirken hata:", error);
                    showErrorInPage('dashboard-page', 'Dashboard verileri yüklenemedi', error.message);
                });
            } else if (typeof loadDashboardDataKOD2 === 'function') {
                loadDashboardDataKOD2().catch(error => {
                    console.error("Dashboard verileri yüklenirken hata:", error);
                    showErrorInPage('dashboard-page', 'Dashboard verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Dashboard verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('dashboard-page');
            }
            
            // Yapay zeka önerilerini yükle
            if (typeof displayAIInsights === 'function') {
                displayAIInsights('ai-recommendations').catch(error => {
                    console.warn("AI önerileri yüklenirken hata:", error);
                });
            }
            break;
            
        case 'sales':
            showLoadingInPage('sales-page');
            pageLoadStatus[pageName] = true;
            
            // Satış sayfası içeriğini yükle
            if (typeof loadSalesData === 'function') {
                loadSalesData().catch(error => {
                    console.error("Satış verileri yüklenirken hata:", error);
                    showErrorInPage('sales-page', 'Satış verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Satış verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('sales-page');
            }
            break;
            
        case 'projects':
            showLoadingInPage('projects-page');
            pageLoadStatus[pageName] = true;
            
            // Projeler sayfası içeriğini yükle
            if (typeof loadProjects === 'function') {
                loadProjects().catch(error => {
                    console.error("Proje verileri yüklenirken hata:", error);
                    showErrorInPage('projects-page', 'Proje verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Proje verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('projects-page');
            }
            break;
            
        case 'production':
            showLoadingInPage('production-page');
            pageLoadStatus[pageName] = true;
            
            // Üretim sayfası içeriğini yükle
            if (typeof loadProductionPlans === 'function') {
                loadProductionPlans().catch(error => {
                    console.error("Üretim verileri yüklenirken hata:", error);
                    showErrorInPage('production-page', 'Üretim verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Üretim verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('production-page');
            }
            break;
            
        case 'stock':
            showLoadingInPage('stock-page');
            pageLoadStatus[pageName] = true;
            
            // Stok sayfası içeriğini yükle
            if (typeof loadStockData === 'function') {
                loadStockData().catch(error => {
                    console.error("Stok verileri yüklenirken hata:", error);
                    showErrorInPage('stock-page', 'Stok verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Stok verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('stock-page');
            }
            break;
            
        case 'purchasing':
            showLoadingInPage('purchasing-page');
            pageLoadStatus[pageName] = true;
            
            // Satın alma sayfası içeriğini yükle
            if (typeof loadPurchaseRequests === 'function') {
                loadPurchaseRequests().catch(error => {
                    console.error("Satın alma verileri yüklenirken hata:", error);
                    showErrorInPage('purchasing-page', 'Satın alma verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Satın alma verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('purchasing-page');
            }
            
            // Eksik malzemeleri yükle
            if (typeof loadMissingMaterials === 'function') {
                loadMissingMaterials().catch(error => {
                    console.warn("Eksik malzemeler yüklenirken hata:", error);
                });
            }
            break;
            
        case 'quality':
            showLoadingInPage('quality-page');
            pageLoadStatus[pageName] = true;
            
            // Kalite sayfası içeriğini yükle
            if (typeof loadQualityData === 'function') {
                loadQualityData().catch(error => {
                    console.error("Kalite verileri yüklenirken hata:", error);
                    showErrorInPage('quality-page', 'Kalite verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Kalite verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('quality-page');
            }
            break;
            
        case 'reports':
            showLoadingInPage('reports-page');
            pageLoadStatus[pageName] = true;
            
            // Raporlar sayfası içeriğini yükle
            if (typeof loadReports === 'function') {
                loadReports().catch(error => {
                    console.error("Rapor verileri yüklenirken hata:", error);
                    showErrorInPage('reports-page', 'Rapor verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Rapor verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('reports-page');
            }
            break;
            
        case 'notes':
            showLoadingInPage('notes-page');
            pageLoadStatus[pageName] = true;
            
            // Notlar sayfası içeriğini yükle
            if (typeof loadNotes === 'function') {
                loadNotes().catch(error => {
                    console.error("Not verileri yüklenirken hata:", error);
                    showErrorInPage('notes-page', 'Not verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Not verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('notes-page');
            }
            break;
            
        case 'ai':
            showLoadingInPage('ai-page');
            pageLoadStatus[pageName] = true;
            
            // Yapay Zeka sayfası içeriğini yükle
            if (typeof displayAIInsights === 'function') {
                displayAIInsights('ai-page').catch(error => {
                    console.error("Yapay zeka verileri yüklenirken hata:", error);
                    showErrorInPage('ai-page', 'Yapay zeka verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Yapay zeka verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('ai-page');
            }
            break;
            
        case 'profile':
            showLoadingInPage('profile-page');
            pageLoadStatus[pageName] = true;
            
            // Profil bilgilerini yükle
            loadProfileData();
            break;
            
        case 'settings':
            showLoadingInPage('settings-page');
            pageLoadStatus[pageName] = true;
            
            // Ayarları yükle
            loadSettingsData();
            break;
            
        case 'orders':
            showLoadingInPage('orders-page');
            pageLoadStatus[pageName] = true;
            
            // Sipariş listesini yükle
            if (typeof loadOrders === 'function') {
                loadOrders().catch(error => {
                    console.error("Sipariş verileri yüklenirken hata:", error);
                    showErrorInPage('orders-page', 'Sipariş verileri yüklenemedi', error.message);
                });
            } else {
                console.warn("Sipariş verilerini yükleyecek fonksiyon bulunamadı");
                hideLoadingInPage('orders-page');
            }
            break;
    }
}

/**
 * Sayfa başlığını getir
 * @param {string} pageName - Sayfa adı
 * @returns {string} - Sayfa başlığı
 */
function getPageTitle(pageName) {
    const titles = {
        'dashboard': 'Kontrol Paneli',
        'sales': 'Satış',
        'projects': 'Projeler',
        'production': 'Üretim',
        'stock': 'Stok',
        'purchasing': 'Satın Alma',
        'quality': 'Kalite',
        'reports': 'Raporlar',
        'notes': 'Notlar',
        'ai': 'Yapay Zeka',
        'profile': 'Profilim',
        'settings': 'Ayarlar',
        'orders': 'Siparişler',
        'customers': 'Müşteriler'
    };
    
    return titles[pageName] || 'ElektroTrack';
}

/**
 * Profil verilerini yükle ve formu doldur
 */
function loadProfileData() {
    if (!appState.currentUser) {
        console.warn("Profil verileri yüklenemedi: Kullanıcı giriş yapmamış");
        hideLoadingInPage('profile-page');
        return;
    }
    
    // Profil formunu doldur
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileDepartment = document.getElementById('profile-department');
    const profilePhone = document.getElementById('profile-phone');
    
    // Email doğrudan mevcut kullanıcıdan gelir
    if (profileEmail) profileEmail.value = appState.currentUser.email || '';
    
    // Diğer bilgileri Firebase'den al
    if (firebase && firebase.firestore) {
        firebase.firestore().collection('users').doc(appState.currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (profileName) profileName.value = userData.name || '';
                    if (profileDepartment) profileDepartment.value = userData.department || '';
                    if (profilePhone) profilePhone.value = userData.phone || '';
                }
                hideLoadingInPage('profile-page');
            })
            .catch(error => {
                console.error("Profil verileri yüklenemedi:", error);
                showToast("Profil verileri yüklenemedi", "error");
                
                // Demo verileri göster
                if (profileName) profileName.value = 'Demo Kullanıcı';
                if (profileDepartment) profileDepartment.value = 'Yönetim';
                
                hideLoadingInPage('profile-page');
            });
    } else {
        // Demo verileri
        if (profileName) profileName.value = appState.currentUser.displayName || 'Demo Kullanıcı';
        if (profileDepartment) profileDepartment.value = 'Yönetim';
        if (profilePhone) profilePhone.value = '';
        
        hideLoadingInPage('profile-page');
    }
}

/**
 * Ayarlar verilerini yükle ve formu doldur
 */
function loadSettingsData() {
    // Tema, dil ve bildirim ayarlarını localStorage'dan al
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const notificationsEnabled = document.getElementById('notifications-enabled');
    
    if (themeSelect) themeSelect.value = appState.theme;
    if (languageSelect) languageSelect.value = appState.language;
    if (notificationsEnabled) notificationsEnabled.checked = appState.notifications;
    
    hideLoadingInPage('settings-page');
}

/**
 * Ayarları kaydet
 */
function saveSettings() {
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const notificationsEnabled = document.getElementById('notifications-enabled');
    
    if (themeSelect) {
        appState.theme = themeSelect.value;
        localStorage.setItem('theme', themeSelect.value);
        applyTheme(themeSelect.value);
    }
    
    if (languageSelect) {
        appState.language = languageSelect.value;
        localStorage.setItem('language', languageSelect.value);
    }
    
    if (notificationsEnabled) {
        appState.notifications = notificationsEnabled.checked;
        localStorage.setItem('notifications', notificationsEnabled.checked);
    }
    
    showToast("Ayarlar kaydedildi", "success");
}

/**
 * Temayı uygula
 * @param {string} theme - Tema adı ('light', 'dark', 'system')
 */
function applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'system') {
        // Sistem ayarlarına göre tema belirle
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1a202c');
    } else {
        body.classList.remove('dark-theme');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1e40af');
    }
}

/**
 * Sayfa içinde loading göster
 * @param {string} pageId - Sayfa element ID'si
 */
function showLoadingInPage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;
    
    // Sayfa içinde loading spinner oluştur
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'page-loading-container';
    loadingContainer.style.position = 'absolute';
    loadingContainer.style.top = '0';
    loadingContainer.style.left = '0';
    loadingContainer.style.width = '100%';
    loadingContainer.style.height = '100%';
    loadingContainer.style.display = 'flex';
    loadingContainer.style.alignItems = 'center';
    loadingContainer.style.justifyContent = 'center';
    loadingContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    loadingContainer.style.zIndex = '10';
    
    loadingContainer.innerHTML = `
        <div class="loading-spinner" style="text-align: center;">
            <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
            <p style="margin-top: 1rem; color: var(--secondary);">Veriler yükleniyor...</p>
        </div>
    `;
    
    // Sayfaya position:relative ekle (mutlak konumlandırma için)
    page.style.position = 'relative';
    
    // Eğer daha önce loading container eklenmişse kaldır
    const existingLoader = page.querySelector('.page-loading-container');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    // Loading container'ı sayfaya ekle
    page.appendChild(loadingContainer);
}

/**
 * Sayfa içindeki loading'i gizle
 * @param {string} pageId - Sayfa element ID'si
 */
function hideLoadingInPage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;
    
    // Loading container'ı bul ve kaldır
    const loadingContainer = page.querySelector('.page-loading-container');
    if (loadingContainer) {
        // Yumuşak geçiş için önce opasitesini azalt
        loadingContainer.style.transition = 'opacity 0.3s ease';
        loadingContainer.style.opacity = '0';
        
        // Animasyon bittikten sonra elementi kaldır
        setTimeout(() => {
            loadingContainer.remove();
        }, 300);
    }
}

/**
 * Sayfa içinde hata mesajı göster
 * @param {string} pageId - Sayfa element ID'si
 * @param {string} title - Hata başlığı
 * @param {string} message - Hata mesajı
 */
function showErrorInPage(pageId, title, message) {
    const page = document.getElementById(pageId);
    if (!page) return;
    
    // Loading göstergesini kaldır
    hideLoadingInPage(pageId);
    
    // Hata mesajı container'ı oluştur
    const errorContainer = document.createElement('div');
    errorContainer.className = 'page-error-container';
    errorContainer.style.margin = '2rem auto';
    errorContainer.style.maxWidth = '600px';
    errorContainer.style.padding = '2rem';
    errorContainer.style.backgroundColor = '#fff8f8';
    errorContainer.style.border = '1px solid #ffcdd2';
    errorContainer.style.borderRadius = '0.5rem';
    errorContainer.style.textAlign = 'center';
    
    errorContainer.innerHTML = `
        <div style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3 style="margin-bottom: 1rem; color: #b91c1c;">${title || 'Hata Oluştu'}</h3>
        <p style="margin-bottom: 1.5rem; color: #64748b;">${message || 'Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'}</p>
        <button class="btn btn-danger" onclick="refreshData()">
            <i class="fas fa-sync-alt"></i> Yeniden Dene
        </button>
    `;
    
    // Sayfanın ilk içerik alanına ekle
    const contentArea = page.querySelector('.card-body') || page;
    contentArea.prepend(errorContainer);
}

/**
 * Modal göster
 * @param {string} modalId - Modal element ID'si
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Modalı açtığımızda body scroll'u engelle
        document.body.style.overflow = 'hidden';
        
        // Modala açılış animasyonu ekle
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.transform = 'translateY(-20px)';
            modalDialog.style.opacity = '0';
            
            setTimeout(() => {
                modalDialog.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                modalDialog.style.transform = 'translateY(0)';
                modalDialog.style.opacity = '1';
            }, 10);
        }
        
        // Özel açılış olayını tetikle
        const event = new CustomEvent('modalOpen', { detail: { modalId } });
        document.dispatchEvent(event);
    }
}

/**
 * Modal kapat
 * @param {string} modalId - Modal element ID'si
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Modala kapanış animasyonu ekle
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            modalDialog.style.transform = 'translateY(-20px)';
            modalDialog.style.opacity = '0';
            
            // Animasyon bittikten sonra modalı tamamen gizle
            setTimeout(() => {
                modal.style.display = 'none';
                // Body scroll'u geri aç
                document.body.style.overflow = '';
                
                // Modal içindeki stilleri sıfırla
                modalDialog.style.transform = '';
                modalDialog.style.opacity = '';
            }, 200);
        } else {
            // Modalda dialog yoksa direkt gizle
            modal.style.display = 'none';
            // Body scroll'u geri aç
            document.body.style.overflow = '';
        }
        
        // Özel kapanış olayını tetikle
        const event = new CustomEvent('modalClose', { detail: { modalId } });
        document.dispatchEvent(event);
    }
}

/**
 * Tab değiştir
 * @param {string} tabId - Tab ID'si
 */
function switchTab(tabId) {
    // Önceki aktif tab ve içeriğini bul
    const activeTab = document.querySelector('.tab.active');
    const activeContent = document.querySelector('.tab-content.active');
    
    // Önceki aktif sınıfları kaldır
    if (activeTab) activeTab.classList.remove('active');
    if (activeContent) activeContent.classList.remove('active');
    
    // Yeni tabı aktif et
    const newTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const newContent = document.getElementById(`${tabId}-content`);
    
    if (newTab) newTab.classList.add('active');
    if (newContent) newContent.classList.add('active');
    
    // Tab değişikliği olayını tetikle
    const event = new CustomEvent('tabChange', { detail: { tabId } });
    document.dispatchEvent(event);
}

/**
 * Giriş sayfasını göster
 */
function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-password-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
    
    // Sayfa değişikliği olayını tetikle
    const event = new CustomEvent('pageChange', { detail: { page: 'login' } });
    document.dispatchEvent(event);
}

/**
 * Kayıt sayfasını göster
 */
function showRegister() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'flex';
    document.getElementById('forgot-password-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
    
    // Sayfa değişikliği olayını tetikle
    const event = new CustomEvent('pageChange', { detail: { page: 'register' } });
    document.dispatchEvent(event);
}

/**
 * Şifre sıfırlama sayfasını göster
 */
function showForgotPassword() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-password-page').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    
    // Sayfa değişikliği olayını tetikle
    const event = new CustomEvent('pageChange', { detail: { page: 'forgot-password' } });
    document.dispatchEvent(event);
}

/**
 * Ana uygulamayı göster
 */
function showMainApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-password-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Sayfa değişikliği olayını tetikle
    const event = new CustomEvent('pageChange', { detail: { page: 'main-app' } });
    document.dispatchEvent(event);
}

/**
 * Demo modunu etkinleştir
 */
function enableDemoMode() {
    console.log("Demo modu etkinleştiriliyor...");
    
    // URL'e demo parametresini ekle (zaten yoksa)
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('demo')) {
        currentUrl.searchParams.set('demo', 'true');
        // Sadece geçmiş girişini değiştir, sayfayı yeniden yükleme
        window.history.replaceState({}, document.title, currentUrl.toString());
    }
    
    // Demo modu durumunu güncelle
    appState.isDemoMode = true;
    
    // Demo modu bildirimi göster
    showDemoModeNotification();
    
    // Demo giriş
    demoLogin();
}

/**
 * Demo modu bildirimini göster
 */
function showDemoModeNotification() {
    const demoModeNotification = document.getElementById('demo-mode-notification');
    if (demoModeNotification) {
        demoModeNotification.style.display = 'block';
    } else {
        // Demo modu bildirimi oluştur
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
 * Verileri yenile
 */
function refreshData() {
    // Yenileme animasyonunu başlat
    const refreshBtn = document.querySelector('.page-header .btn-outline i');
    if (refreshBtn) {
        refreshBtn.classList.add('fa-spin');
    }
    
    // Mevcut sayfanın daha önce yüklenip yüklenmediği bilgisini sıfırla
    pageLoadStatus[appState.currentPage] = false;
    
    // Mevcut sayfaya göre verileri yenile
    loadPageContent(appState.currentPage);
    
    // Animasyonu durdur
    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.classList.remove('fa-spin');
        }
        showToast(`${getPageTitle(appState.currentPage)} verileri güncellendi`, "success");
    }, 1000);
}

/**
 * Sipariş oluşturma modalını göster
 */
function showCreateOrderModal() {
    // Form alanlarını temizle
    const form = document.getElementById('create-order-form');
    if (form) {
        form.reset();
        
        // Bugünün tarihini ayarla
        const orderDateInput = form.elements['orderDate'];
        const deliveryDateInput = form.elements['deliveryDate'];
        if (orderDateInput) {
            const today = new Date().toISOString().split('T')[0];
            orderDateInput.value = today;
        }
        if (deliveryDateInput) {
            // 30 gün sonrası için teslim tarihi
            const defaultDeliveryDate = new Date();
            defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 30);
            deliveryDateInput.value = defaultDeliveryDate.toISOString().split('T')[0];
        }
    }
    
    // Müşteri listesini doldur
    fillCustomerSelect();
    
    // Modalı göster
    showModal('create-order-modal');
}

/**
 * Müşteri seçim listesini doldur
 */
function fillCustomerSelect() {
    const customerSelect = document.querySelector('#create-order-form select[name="customer"]');
    if (!customerSelect) return;
    
    // Yükleniyor
    customerSelect.innerHTML = '<option value="">Yükleniyor...</option>';
    
    // Firestore'dan müşterileri al
    if (firebase && firebase.firestore) {
        firebase.firestore().collection('customers').orderBy('name', 'asc').get()
            .then(snapshot => {
                if (snapshot.empty) {
                    fillCustomerSelectWithDemoData(customerSelect);
                    return;
                }
                
                // Müşteri listesini doldur
                customerSelect.innerHTML = '<option value="">Müşteri Seçin</option>';
                snapshot.forEach(doc => {
                    const customer = doc.data();
                    customerSelect.innerHTML += `<option value="${customer.name}">${customer.name}</option>`;
                });
            })
            .catch(error => {
                console.error('Müşteri listesi yükleme hatası:', error);
                fillCustomerSelectWithDemoData(customerSelect);
            });
    } else {
        // Firebase yoksa örnek veriler
        fillCustomerSelectWithDemoData(customerSelect);
    }
}

/**
 * Müşteri seçimini demo verilerle doldur
 * @param {HTMLElement} customerSelect - Müşteri seçim elementi
 */
function fillCustomerSelectWithDemoData(customerSelect) {
    const sampleCustomers = [
        { id: 'customer-1', name: 'AYEDAŞ' },
        { id: 'customer-2', name: 'ENERJİSA' },
        { id: 'customer-3', name: 'BAŞKENT EDAŞ' },
        { id: 'customer-4', name: 'TOROSLAR EDAŞ' }
    ];
    
    customerSelect.innerHTML = '<option value="">Müşteri Seçin</option>';
    sampleCustomers.forEach(customer => {
        customerSelect.innerHTML += `<option value="${customer.name}">${customer.name}</option>`;
    });
}

/**
 * Kullanıcı menüsünü göster/gizle
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

/**
 * Optimizasyon planını uygula (demo)
 */
function applyOptimizationPlan() {
    // Yükleniyor göster
    toggleLoading(true);
    
    // Demo için biraz bekleyelim
    setTimeout(() => {
        // Yükleniyor gizle
        toggleLoading(false);
        
        // Başarılı mesajı göster
        showToast("Optimizasyon planı başarıyla uygulandı. Üretim planları güncellendi.", "success");
        
        // Bildirimi kapat
        const aiRecommendations = document.getElementById('ai-recommendations');
        if (aiRecommendations) {
            aiRecommendations.innerHTML = `
                <div class="info-box success">
                    <div class="info-box-title">Optimizasyon Tamamlandı</div>
                    <div class="info-box-content">
                        <p>RM 36 LB tipindeki 3 siparişin üretimi birleştirildi. Tasarruf: 5 iş günü, 12.500₺ maliyet.</p>
                    </div>
                </div>
            `;
        }
        
        // Dashboard verilerini yenile
        loadPageContent('dashboard');
    }, 2000);
}

/**
 * Toast mesajı göster
 * @param {string} message - Mesaj metni
 * @param {string} type - Mesaj tipi (success, error, warning, info)
 * @param {number} duration - Mesajın görüntülenme süresi (ms)
 */
function showToast(message, type = 'success', duration = 3000) {
    // Toast container elementini kontrol et veya oluştur
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Toast elementini oluştur
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.marginBottom = '10px';
    toast.style.padding = '10px 15px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.minWidth = '250px';
    toast.style.maxWidth = '350px';
    
    // Toast içeriğini oluştur
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '10px';
    
    // İkon
    const icon = document.createElement('i');
    icon.className = 'fas';
    
    // Tip'e göre stil ayarları
    switch (type) {
        case 'success':
            toast.style.backgroundColor = '#d4edda';
            toast.style.color = '#155724';
            icon.className += ' fa-check-circle';
            break;
        case 'error':
            toast.style.backgroundColor = '#f8d7da';
            toast.style.color = '#721c24';
            icon.className += ' fa-times-circle';
            break;
        case 'warning':
            toast.style.backgroundColor = '#fff3cd';
            toast.style.color = '#856404';
            icon.className += ' fa-exclamation-triangle';
            break;
        case 'info':
            toast.style.backgroundColor = '#d1ecf1';
            toast.style.color = '#0c5460';
            icon.className += ' fa-info-circle';
            break;
        default:
            toast.style.backgroundColor = '#f8f9fa';
            toast.style.color = '#212529';
            icon.className += ' fa-bell';
    }
    
    content.appendChild(icon);
    
    // Mesaj metni
    const text = document.createElement('span');
    text.textContent = message;
    content.appendChild(text);
    
    toast.appendChild(content);
    
    // Kapatma butonu
    const closeBtn = document.createElement('button');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.padding = '0';
    closeBtn.style.color = 'inherit';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function() {
        toastContainer.removeChild(toast);
    });
    
    toast.appendChild(closeBtn);
    
    // Toast'u container'a ekle
    toastContainer.appendChild(toast);
    
    // Toast'u akıcı bir şekilde göster
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Akıcı geçiş için timeout kullan
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Toast'u otomatik kapat
    setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            // Kaldırılmadan önce animasyon ekle
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
}

/**
 * Loading spinner göster/gizle
 * @param {boolean} show - Göster/gizle durumu
 * @param {string} containerId - Loading spinner'ın ekleneceği container ID'si (opsiyonel)
 */
function toggleLoading(show, containerId = null) {
    // Loading overlay'i al veya oluştur
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (show) {
        appState.isLoading = true;
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.style.position = containerId ? 'absolute' : 'fixed';
            loadingOverlay.style.top = '0';
            loadingOverlay.style.left = '0';
            loadingOverlay.style.width = '100%';
            loadingOverlay.style.height = '100%';
            loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.alignItems = 'center';
            loadingOverlay.style.justifyContent = 'center';
            loadingOverlay.style.zIndex = '9999';
            
            // Spinner elementi
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '<i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary);"></i>';
            loadingOverlay.appendChild(spinner);
            
            // Container'a ekle
            if (containerId) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.style.position = 'relative';
                    container.appendChild(loadingOverlay);
                } else {
                    document.body.appendChild(loadingOverlay);
                }
            } else {
                document.body.appendChild(loadingOverlay);
            }
        }
    } else {
        appState.isLoading = false;
        
        // Loading overlay'i kaldır
        if (loadingOverlay) {
            // Yumuşak geçiş için
            loadingOverlay.style.transition = 'opacity 0.3s ease';
            loadingOverlay.style.opacity = '0';
            
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 300);
        }
    }
}

/**
 * Service worker kaydı
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function(registration) {
                    console.log('ServiceWorker başarıyla kaydedildi:', registration.scope);
                })
                .catch(function(error) {
                    console.log('ServiceWorker kaydı başarısız:', error);
                });
        });
    }
}

/**
 * Sayfa değişikliği olayını tetikle
 * @param {string} page - Sayfa adı
 */
function dispatchPageChangeEvent(page) {
    const event = new CustomEvent('pageChanged', {
        detail: {
            page: page
        }
    });
    document.dispatchEvent(event);
}

/**
 * Tarih formatla
 * @param {Date|string|Object} date - Tarih objesi, string veya Firestore Timestamp
 * @returns {string} - Formatlanmış tarih (GG.AA.YYYY)
 */
function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        // ISO formatında ise
        if (date.includes('T')) {
            date = new Date(date);
        } else if (date.includes('.')) {
            // TR formatında (12.05.2024) ise
            const parts = date.split('.');
            if (parts.length === 3) {
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                return date; // Anlaşılamayan format
            }
        } else if (date.includes('/')) {
            // US formatında (05/12/2024) ise
            const parts = date.split('/');
            if (parts.length === 3) {
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            } else {
                return date; // Anlaşılamayan format
            }
        } else {
            return date; // Anlaşılamayan format
        }
    } else if (date && typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
        // Firebase Timestamp ise
        try {
            date = date.toDate();
        } catch (e) {
            console.error("Tarih dönüştürme hatası:", e);
            return '';
        }
    } else if (!(date instanceof Date)) {
        return ''; // Geçersiz format
    }
    
    return date.toLocaleDateString('tr-TR');
}

// Gerekli fonksiyonları global olarak dışa aktar
window.showPage = showPage;
window.showModal = showModal;
window.closeModal = closeModal;
window.switchTab = switchTab;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showForgotPassword = showForgotPassword;
window.showMainApp = showMainApp;
window.enableDemoMode = enableDemoMode;
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.refreshData = refreshData;
window.showCreateOrderModal = showCreateOrderModal;
window.applyOptimizationPlan = applyOptimizationPlan;
window.toggleUserMenu = toggleUserMenu;
window.formatDate = formatDate;
window.appState = appState;

// Sayfa yüklendiğinde initApp çağrılsın
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initApp === 'function') {
        initApp();
    } else {
        console.warn("initApp fonksiyonu zaten tanımlanmış, main.js'deki başka bir script tarafından yüklenmiş olabilir");
        
        // Bu durumda manuel olarak başlatma yapalım
        setupEventListeners();
        checkUserAuthentication();
    }
});