 /**
 * firebase-config.js
 * Firebase yapılandırma ve başlatma işlemleri
 */

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyAFQdnF6RGFuQmrtjB3rCo_fkoQNk0QPJ4",
    authDomain: "mehmentendustriyeltakip.firebaseapp.com",
    projectId: "mehmentendustriyeltakip",
    storageBucket: "mehmentendustriyeltakip.appspot.com",
    messagingSenderId: "100391457932",
    appId: "1:100391457932:web:0fe2f9aab2835220a56466",
    measurementId: "G-L4TMML2WR2"
};

// Demo mod kontrolü (global olarak tanımlanmış olabilir)
const isDemoMode = window.CONFIG?.isDemo || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('netlify.app') ||
                   window.location.search.includes('demo=true');

// Firebase bileşenleri için global değişkenler
let app, auth, db, analytics, storage, functions;

// Firebase'i başlat
async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Firebase başlatılıyor...');
            
            // Firebase tanımlı mı kontrol et
            if (typeof firebase === 'undefined') {
                console.error('Firebase SDK yüklenemedi. Demo moda geçiliyor...');
                enableDemoMode();
                resolve(false);
                return;
            }
            
            // Firebase uygulamasını başlat
            if (!firebase.apps.length) {
                try {
                    app = firebase.initializeApp(firebaseConfig);
                    console.log("Firebase başlatıldı");
                } catch (initError) {
                    console.warn("Firebase başlatılamadı, demo moda geçiliyor", initError);
                    enableDemoMode();
                    resolve(false);
                    return;
                }
            } else {
                app = firebase.app();
            }
            
            // Firebase servislerini başlat
            try {
                initializeFirebaseServices()
                    .then(() => {
                        console.log("Firebase servisleri başarıyla başlatıldı");
                        
                        // Demo modda olduğumuzu kontrol et ve bildirimi göster
                        if (isDemoMode) {
                            console.log("Demo modu aktif");
                            showDemoModeNotification();
                        }
                        
                        // İlk veri seti kontrolü - bunu başka bir fonksiyona taşıyalım
                        checkInitialDataset()
                            .then(() => resolve(true))
                            .catch(error => {
                                console.warn("İlk veri seti kontrolünde hata:", error);
                                resolve(true); // Yine de devam etmek için true döndürüyoruz
                            });
                    })
                    .catch(error => {
                        console.error("Firebase servisleri başlatılamadı:", error);
                        enableDemoMode();
                        resolve(false);
                    });
            } catch (serviceError) {
                console.warn("Firebase servisleri alınamadı, demo moda geçiliyor", serviceError);
                enableDemoMode();
                resolve(false);
                return;
            }
        } catch (error) {
            console.error("Firebase başlatma hatası:", error);
            enableDemoMode();
            resolve(false);
        }
    });
}

// Firebase servislerini başlat
async function initializeFirebaseServices() {
    try {
        // Auth servisi
        if (firebase.auth) {
            auth = firebase.auth();
            
            // Auth persistance modunu ayarla
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log("Firebase Auth başlatıldı ve persistance ayarlandı");
        } else {
            console.warn("Firebase Auth modülü bulunamadı");
        }
        
        // Firestore servisi
        if (firebase.firestore) {
            db = firebase.firestore();
            
            // Çevrimdışı persistance'ı etkinleştir
            try {
                await db.enablePersistence({
                    synchronizeTabs: true
                });
                console.log("Firestore çevrimdışı persistance etkinleştirildi");
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    console.warn("Birden fazla sekme açık, çevrimdışı persistance devre dışı");
                } else if (err.code === 'unimplemented') {
                    console.warn("Tarayıcı Firestore çevrimdışı persistance desteklemiyor");
                } else {
                    console.error("Firestore persistance hatası:", err);
                }
            }
            
            console.log("Firestore başlatıldı");
        } else {
            console.warn("Firestore modülü bulunamadı");
        }
        
        // Storage servisi (varsa)
        if (firebase.storage) {
            storage = firebase.storage();
            console.log("Firebase Storage başlatıldı");
        }
        
        // Cloud Functions servisi (varsa)
        if (firebase.functions) {
            functions = firebase.functions();
            console.log("Firebase Functions başlatıldı");
        }
        
        // Analytics servisi (varsa)
        if (firebase.analytics) {
            analytics = firebase.analytics();
            console.log("Firebase Analytics başlatıldı");
            
            // Demo modu takibi için özel event
            if (isDemoMode) {
                analytics.logEvent('demo_mode_enabled');
            }
        }
        
        // Global değişkenlere ata (bazı eski kodlar için gerekli olabilir)
        window.firebase = firebase;
        window.auth = auth;
        window.db = db;
        window.storage = storage;
        window.functions = functions;
        window.analytics = analytics;
        
        return true;
    } catch (error) {
        console.error("Firebase servisleri başlatılamadı:", error);
        throw error;
    }
}

// İlk veri seti kontrolü (demo veriler için)
async function checkInitialDataset() {
    try {
        // Eğer demo modda değilsek atla
        if (!isDemoMode) {
            return true;
        }
        
        console.log("Demo modu için veri seti kontrolü yapılıyor...");
        
        // Koleksiyon var mı kontrol et
        const collections = ['users', 'orders', 'materials', 'customers', 'notes'];
        let dataExists = true;
        
        if (!db) {
            console.warn("Firestore bağlantısı olmadığı için veri seti kontrolü atlanıyor");
            return false;
        }
        
        for (const collection of collections) {
            try {
                const snapshot = await db.collection(collection).limit(1).get();
                if (snapshot.empty) {
                    console.log(`'${collection}' koleksiyonu boş, veriler yüklenecek`);
                    dataExists = false;
                    break;
                }
            } catch (e) {
                console.warn(`'${collection}' koleksiyonu kontrol edilirken hata:`, e);
                dataExists = false;
                break;
            }
        }
        
        // Eğer veriler yoksa, demo verilerini yükle
        if (!dataExists) {
            console.log("Demo veriler yükleniyor...");
            try {
                if (typeof seedSampleData === 'function') {
                    await seedSampleData();
                    console.log("Demo veriler başarıyla yüklendi");
                } else {
                    console.warn("seedSampleData fonksiyonu bulunamadığı için demo veriler yüklenemedi");
                }
            } catch (error) {
                console.error("Demo verileri yüklenirken hata:", error);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Veri seti kontrolünde hata:", error);
        return false;
    }
}

// Demo modunu etkinleştir
function enableDemoMode() {
    console.log("Demo modu etkinleştiriliyor...");
    
    // Demo modunda olduğumuzu işaretle
    window.isDemoMode = true;
    
    // URL'e demo parametresini ekle
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('demo')) {
        currentUrl.searchParams.set('demo', 'true');
        
        // Sayfa yeniden yüklemesi olmadan URL'i güncelle
        window.history.replaceState({}, document.title, currentUrl.toString());
    }
    
    // Mock Firebase yükle (eğer normal Firebase yüklenemezse)
    if (typeof firebase === 'undefined') {
        console.log("Mock Firebase yükleniyor...");
        loadMockFirebase();
    }
    
    // Demo modu bildirimi göster
    showDemoModeNotification();
}

// Mock Firebase yükle
function loadMockFirebase() {
    const scriptElement = document.createElement('script');
    scriptElement.src = 'js/mock-firebase.js';
    scriptElement.async = true;
    
    scriptElement.onload = () => {
        console.log("Mock Firebase yüklendi");
        
        // Firebase yoksa Mock Firebase'i global firebase değişkenine ata
        if (typeof firebase === 'undefined' && typeof mockFirebase !== 'undefined') {
            window.firebase = mockFirebase;
        }
        
        // Başlatmayı yeniden dene
        setTimeout(() => {
            initializeFirebase();
        }, 500);
    };
    
    scriptElement.onerror = (error) => {
        console.error("Mock Firebase yüklenemedi:", error);
    };
    
    document.body.appendChild(scriptElement);
}

// Demo modu bildirimini göster
function showDemoModeNotification() {
    const demoModeNotification = document.getElementById('demo-mode-notification');
    if (demoModeNotification) {
        demoModeNotification.style.display = 'block';
    } else {
        // Demo modu bildirimi oluştur
        setTimeout(() => {
            const container = document.createElement('div');
            container.id = 'demo-mode-notification';
            container.className = 'info-box warning';
            container.style.position = 'fixed';
            container.style.bottom = '10px';
            container.style.left = '10px';
            container.style.width = 'auto';
            container.style.zIndex = '1000';
            container.style.display = 'block';
            
            container.innerHTML = `
                <div class="info-box-title">Demo Modu</div>
                <div class="info-box-content">
                    <p>Uygulama şu anda demo modunda çalışıyor. Firebase kimlik doğrulaması atlanıyor.</p>
                    <button class="btn btn-sm btn-warning" onclick="document.getElementById('demo-mode-notification').style.display = 'none';">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                </div>
            `;
            
            document.body.appendChild(container);
        }, 1000);
    }
}

// DOMContentLoaded olayı için dinleyici
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Firebase'i başlatmayı dene
        const firebaseInitialized = await initializeFirebase();
        
        // App State güncelle (window.appState app.js'de oluşturulmuş olabilir)
        if (window.appState) {
            window.appState.firebaseInitialized = firebaseInitialized;
        }
        
        // InitApp fonksiyonu varsa çağır
        if (typeof initApp === 'function') {
            console.log("initApp fonksiyonu çağrılıyor...");
            initApp();
        } else {
            console.warn("initApp fonksiyonu bulunamadı.");
            
            // Oturum kontrolü için auth state değişikliklerini dinle
            if (auth) {
                auth.onAuthStateChanged(user => {
                    if (user) {
                        console.log("Kullanıcı oturum açmış:", user.email);
                        
                        // Kullanıcı bilgisini global değişkene ata
                        window.currentUser = user;
                        
                        // Ana uygulamayı göster
                        if (typeof showMainApp === 'function') {
                            showMainApp();
                        } else {
                            // Manuel olarak göster
                            const mainApp = document.getElementById('main-app');
                            const loginPage = document.getElementById('login-page');
                            
                            if (mainApp) mainApp.style.display = 'block';
                            if (loginPage) loginPage.style.display = 'none';
                        }
                        
                        // Dashboard verilerini yükle
                        if (typeof loadDashboardData === 'function') {
                            loadDashboardData();
                        }
                    } else {
                        console.log("Kullanıcı oturum açmamış");
                        
                        // Demo modunda otomatik giriş yap
                        if (isDemoMode) {
                            console.log("Demo modu için otomatik giriş yapılıyor...");
                            
                            if (typeof demoLogin === 'function') {
                                demoLogin();
                            } else {
                                // Manuel demo giriş
                                window.currentUser = {
                                    uid: 'demo-user-1',
                                    email: 'demo@elektrotrack.com',
                                    displayName: 'Demo Kullanıcı'
                                };
                                
                                // Ana uygulamayı göster
                                const mainApp = document.getElementById('main-app');
                                const loginPage = document.getElementById('login-page');
                                
                                if (mainApp) mainApp.style.display = 'block';
                                if (loginPage) loginPage.style.display = 'none';
                                
                                // Dashboard verilerini yükle
                                if (typeof loadDashboardData === 'function') {
                                    loadDashboardData();
                                }
                            }
                        } else {
                            // Login sayfasını göster
                            const mainApp = document.getElementById('main-app');
                            const loginPage = document.getElementById('login-page');
                            
                            if (mainApp) mainApp.style.display = 'none';
                            if (loginPage) loginPage.style.display = 'flex';
                        }
                    }
                });
            } else if (isDemoMode) {
                console.log("Firebase Auth yok, demo modunda doğrudan giriş yapılıyor");
                
                // Demo kullanıcısı oluştur
                window.currentUser = {
                    uid: 'demo-user-1',
                    email: 'demo@elektrotrack.com',
                    displayName: 'Demo Kullanıcı'
                };
                
                // Ana uygulamayı göster
                const mainApp = document.getElementById('main-app');
                const loginPage = document.getElementById('login-page');
                
                if (mainApp) mainApp.style.display = 'block';
                if (loginPage) loginPage.style.display = 'none';
                
                // Dashboard verilerini yükle
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
            }
        }
    } catch (error) {
        console.error("Uygulama başlatma hatası:", error);
        enableDemoMode();
    }
});

// Firebase erişilemezse ya da hata oluşursa demo moda geçiş için timeout
setTimeout(() => {
    // Hala login sayfasındaysak ve demo modunda değilsek
    if (document.getElementById('login-page') && 
        document.getElementById('login-page').style.display !== 'none' && 
        !isDemoMode) {
        
        console.warn("Firebase bağlantı zaman aşımı, demo moduna geçiliyor");
        enableDemoMode();
        
        // Demo kullanıcısıyla otomatik giriş yap
        if (typeof demoLogin === 'function') {
            demoLogin();
        } else {
            // Manuel demo giriş
            window.currentUser = {
                uid: 'demo-user-1',
                email: 'demo@elektrotrack.com',
                displayName: 'Demo Kullanıcı'
            };
            
            // Ana uygulamayı göster
            const mainApp = document.getElementById('main-app');
            const loginPage = document.getElementById('login-page');
            
            if (mainApp) mainApp.style.display = 'block';
            if (loginPage) loginPage.style.display = 'none';
            
            // Dashboard verilerini yükle
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        }
    }
}, 10000); // 10 saniye timeout

// Global erişim için
window.initializeFirebase = initializeFirebase;