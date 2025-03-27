/**
 * auth.js
 * Firebase kimlik doğrulama işlevleri ve kullanıcı yönetimi
 */

// Global durum izleyicileri
const authState = {
    isProcessing: false,  // İşlem devam ediyor mu
    lastError: null,      // Son hata
    currentProvider: null // Aktif sağlayıcı (email, google, vb.)
};

/**
 * Kullanıcı girişi yap
 * @param {string} email - Kullanıcı e-posta adresi
 * @param {string} password - Kullanıcı şifresi
 * @returns {Promise} - Giriş işlemi sonucu
 */
async function login(email = null, password = null) {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Form değerlerini al (parametre olarak gelmemişse)
        if (!email) email = document.getElementById('username')?.value;
        if (!password) password = document.getElementById('password')?.value;
        
        if(!email || !password) {
            showToast('E-posta ve şifre giriniz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'E-posta ve şifre giriniz' };
        }
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase ile giriş yap
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                console.log("Firebase ile giriş başarılı:", user.email);
                
                // Kullanıcı bilgilerini Firestore'dan al
                await loadUserData(user);
                
                // Giriş başarılı mesajı
                showToast(`Hoş geldiniz, ${user.displayName || user.email}`, 'success');
                
                // Ana uygulamayı göster
                showMainApp();
                
                // İlk sayfayı yükle
                showPage(window.currentPage || 'dashboard');
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                
                return { success: true, user };
            } catch (authError) {
                console.error("Firebase giriş hatası:", authError);
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                authState.lastError = authError;
                
                // Firebase kimlik doğrulama hatası
                let errorMessage = 'Giriş yapılırken bir hata oluştu.';
                
                if (authError.code) {
                    switch(authError.code) {
                        case 'auth/invalid-credential':
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                            errorMessage = 'E-posta adresi veya şifre hatalı.';
                            break;
                        case 'auth/user-disabled':
                            errorMessage = 'Bu hesap devre dışı bırakıldı.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
                            break;
                    }
                }
                
                showToast(errorMessage, 'error');
                
                // Firebase bağlantı sorunu varsa demo moda geç
                if (authError.code === 'auth/network-request-failed' || authError.code === 'auth/internal-error') {
                    enableDemoModeWithLoginPrompt(email);
                }
                
                return { success: false, error: errorMessage, code: authError.code };
            }
        } else {
            // Firebase yoksa demo giriş yap
            console.log("Firebase Auth bulunamadı, demo giriş yapılıyor");
            
            // Demo kullanıcısı oluştur
            window.currentUser = {
                uid: 'demo-user',
                email: email || 'demo@elektrotrack.com',
                displayName: email?.split('@')[0] || 'Demo Kullanıcı'
            };
            
            // Demo giriş mesajı göster
            showToast('Demo modunda giriş yapıldı', 'info');
            
            // Demo modu bildirimi göster
            showDemoModeNotification();
            
            // Ana uygulamayı göster
            showMainApp();
            
            // Dashboard'ı yükle
            showPage('dashboard');
            
            // Auth durumunu güncelle
            authState.isProcessing = false;
            
            return { success: true, user: window.currentUser, demo: true };
        }
    } catch (error) {
        console.error("Giriş işlemi hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        showToast('Giriş yapılırken bir hata oluştu', 'error');
        
        // Demo moda geçip otomatik giriş yap
        enableDemoModeWithLoginPrompt();
        
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Demo modu ile giriş yapma
 * @param {string} email - Kullanıcı e-posta adresi (opsiyonel)
 */
function enableDemoModeWithLoginPrompt(email = 'demo@elektrotrack.com') {
    // Gecikme ile göster (kullanıcı hatayı görebilsin)
    setTimeout(() => {
        const shouldSwitchToDemo = confirm("Firebase bağlantısı kurulamadı. Demo modunda devam etmek ister misiniz?");
        if (shouldSwitchToDemo) {
            // Demo modu parametresini URL'e ekle
            const currentUrl = new URL(window.location.href);
            if (!currentUrl.searchParams.has('demo')) {
                currentUrl.searchParams.set('demo', 'true');
                window.history.replaceState({}, document.title, currentUrl.toString());
            }
            
            // Demo giriş bilgilerini doldur
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (usernameInput) usernameInput.value = 'demo@elektrotrack.com';
            if (passwordInput) passwordInput.value = 'demo123';
            
            // Demo giriş
            demoLogin();
        }
    }, 500);
}

/**
 * Demo giriş işlemi
 * @returns {Object} - Demo kullanıcısı
 */
function demoLogin() {
    // Demo kullanıcısı
    window.currentUser = {
        uid: 'demo-user-1',
        email: 'demo@elektrotrack.com',
        displayName: 'Demo Kullanıcı',
        role: 'admin',
        department: 'Yönetim'
    };
    
    // Demo giriş mesajı göster
    showToast('Demo modunda giriş yapıldı', 'info');
    
    // Demo modu bildirimi göster
    showDemoModeNotification();
    
    // Ana uygulamayı göster
    showMainApp();
    
    // Dashboard'ı yükle
    showPage('dashboard');
    
    return window.currentUser;
}

/**
 * Şifre sıfırlama
 * @param {string} email - Kullanıcı e-posta adresi (opsiyonel)
 * @returns {Promise} - Şifre sıfırlama işlemi sonucu
 */
async function resetPassword(email = null) {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // E-posta değerini al (parametre olarak gelmemişse)
        if (!email) email = document.getElementById('forgot-email')?.value;
        
        if(!email) {
            showToast('E-posta adresinizi giriniz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'E-posta adresinizi giriniz' };
        }
        
        // Email formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)) {
            showToast('Geçerli bir e-posta adresi giriniz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Geçerli bir e-posta adresi giriniz' };
        }
        
        // Firebase ile şifre sıfırlama e-postası gönder
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                
                showToast(`${email} adresine şifre sıfırlama bağlantısı gönderildi.`, 'success');
                showLogin();
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                
                return { success: true };
            } catch (authError) {
                console.error("Şifre sıfırlama hatası:", authError);
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                authState.lastError = authError;
                
                let errorMessage = 'Şifre sıfırlama bağlantısı gönderilirken bir hata oluştu.';
                
                if (authError.code) {
                    switch(authError.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Geçersiz e-posta adresi.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
                            break;
                    }
                }
                
                showToast(errorMessage, 'error');
                
                // Demo moda geçme seçeneği sun
                if (authError.code === 'auth/network-request-failed') {
                    enableDemoModeWithLoginPrompt();
                }
                
                return { success: false, error: errorMessage, code: authError.code };
            }
        } else {
            // Demo modunda şifre sıfırlama
            console.log("Firebase Auth bulunamadı, demo şifre sıfırlama");
            
            showToast('Demo modunda şifre sıfırlama işlemi gerçekleştirildi', 'info');
            showLogin();
            
            // Auth durumunu güncelle
            authState.isProcessing = false;
            
            return { success: true, demo: true };
        }
    } catch (error) {
        console.error("Şifre sıfırlama hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        showToast('Şifre sıfırlama işlemi sırasında bir hata oluştu', 'error');
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Kullanıcı kaydı yap
 * @param {string} email - Kullanıcı e-posta adresi
 * @param {string} password - Kullanıcı şifresi
 * @param {string} name - Kullanıcı adı
 * @returns {Promise} - Kayıt işlemi sonucu
 */
async function register(email, password, name) {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // Form değerlerini al (parametre olarak gelmemişse)
        if (!userData) {
            const name = document.getElementById('register-name')?.value;
            const email = document.getElementById('register-email')?.value;
            const username = document.getElementById('register-username')?.value;
            const department = document.getElementById('register-department')?.value;
            const password = document.getElementById('register-password')?.value;
            const confirmPassword = document.getElementById('register-password-confirm')?.value;
            
            userData = { name, email, username, department, password, confirmPassword };
        }
        
        // Validasyon kontrolleri
        if(!userData.name || !userData.email || !userData.username || !userData.department || !userData.password || !userData.confirmPassword) {
            showToast('Tüm alanları doldurunuz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Tüm alanları doldurunuz' };
        }
        
        if(userData.password !== userData.confirmPassword) {
            showToast('Şifreler eşleşmiyor', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Şifreler eşleşmiyor' };
        }
        
        // Şifre gücünü kontrol et
        if(userData.password.length < 6) {
            showToast('Şifre en az 6 karakter olmalı', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Şifre en az 6 karakter olmalı' };
        }
        
        // Email formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(userData.email)) {
            showToast('Geçerli bir e-posta adresi giriniz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Geçerli bir e-posta adresi giriniz' };
        }
        
        // Firebase ile kullanıcı oluştur
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            try {
                // Kullanıcı adı kontrolü - mevcut bir kullanıcı adı mı?
                const usernameQuery = await firebase.firestore().collection('users')
                    .where('username', '==', userData.username)
                    .get();
                
                if(!usernameQuery.empty) {
                    showToast('Bu kullanıcı adı zaten kullanımda', 'warning');
                    authState.isProcessing = false;
                    return { success: false, error: 'Bu kullanıcı adı zaten kullanımda' };
                }
                
                // Kullanıcı oluştur
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(userData.email, userData.password);
                const user = userCredential.user;
                
                // Kullanıcı bilgilerini Firestore'a kaydet
                await firebase.firestore().collection('users').doc(user.uid).set({
                    name: userData.name,
                    email: userData.email,
                    username: userData.username,
                    department: userData.department,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'user', // Varsayılan rol
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Displayname güncelle
                await user.updateProfile({
                    displayName: userData.name
                });
                
                showToast('Kayıt işlemi başarılı! Giriş yapabilirsiniz.', 'success');
                showLogin();
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                
                return { success: true, user };
            } catch (authError) {
                console.error("Firebase kayıt hatası:", authError);
                
                // Auth durumunu güncelle
                authState.isProcessing = false;
                authState.lastError = authError;
                
                let errorMessage = 'Kayıt olurken bir hata oluştu.';
                
                if (authError.code) {
                    switch(authError.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Bu e-posta adresi zaten kullanımda.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Geçersiz e-posta adresi.';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Şifre çok zayıf, daha güçlü bir şifre seçin.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
                            break;
                    }
                }
                
                showToast(errorMessage, 'error');
                
                // Firebase bağlantı sorunu varsa demo moda geç
                if (authError.code === 'auth/network-request-failed') {
                    enableDemoModeWithLoginPrompt();
                }
                
                return { success: false, error: errorMessage, code: authError.code };
            }
        } else {
            // Firebase yoksa demo kayıt yap
            console.log("Firebase Auth bulunamadı, demo kayıt yapılıyor");
            
            showToast('Demo modunda kayıt işlemi şu an desteklenmiyor. Lütfen demo kullanıcısı ile giriş yapın.', 'info');
            showLogin();
            
            // Auth durumunu güncelle
            authState.isProcessing = false;
            
            return { success: false, demo: true, error: 'Demo modunda kayıt işlemi desteklenmiyor' };
        }
    } catch (error) {
        console.error("Kayıt hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        showToast('Kayıt olurken bir hata oluştu', 'error');
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Şifre değiştirme
 * @param {string} currentPassword - Mevcut şifre
 * @param {string} newPassword - Yeni şifre
 * @returns {Promise} - Şifre değiştirme işlemi sonucu
 */
async function changePassword(currentPassword, newPassword) {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase kontrolü
        if (!firebase || !firebase.auth) {
            showToast('Demo modunda şifre değiştirme işlemi mevcut değil', 'info');
            authState.isProcessing = false;
            return { success: false, error: 'Demo modunda şifre değiştirme işlemi mevcut değil' };
        }
        
        // Geçerli kullanıcıyı al
        const user = firebase.auth().currentUser;
        if (!user) {
            showToast('Kullanıcı oturumu bulunamadı', 'error');
            authState.isProcessing = false;
            return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
        }
        
        // Mevcut şifreyi doğrula
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        // Kullanıcıyı yeniden doğrula
        await user.reauthenticateWithCredential(credential);
        
        // Şifreyi güncelle
        await user.updatePassword(newPassword);
        
        showToast('Şifreniz başarıyla güncellendi', 'success');
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        
        return { success: true };
    } catch (error) {
        console.error("Şifre değiştirme hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        // Hata mesajına göre kullanıcıya bilgi ver
        let errorMessage = 'Şifre değiştirilirken bir hata oluştu.';
        
        if (error.code) {
            switch(error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Mevcut şifreniz hatalı.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Yeni şifre çok zayıf, daha güçlü bir şifre seçin.';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Bu işlem için yakın zamanda giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.';
                    break;
            }
        }
        
        showToast(errorMessage, 'error');
        return { success: false, error: errorMessage };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Kullanıcı çıkışı yap
 */
function logout() {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase ile çıkış yap
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                await firebase.auth().signOut();
                
                showToast('Başarıyla çıkış yapıldı', 'success');
            } catch (authError) {
                console.error("Çıkış hatası:", authError);
                showToast('Çıkış yapılırken bir hata oluştu', 'error');
            }
        } else {
            // Demo modunda çıkış
            window.currentUser = null;
            
            showToast('Demo modundan çıkış yapıldı', 'info');
        }
        
        // Global kullanıcı değişkenini temizle
        window.currentUser = null;
        
        // Giriş sayfasına yönlendir
        showLogin();
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        
        return { success: true };
    } catch (error) {
        console.error("Çıkış hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
        
        // Giriş sayfasına yönlendir (hata olsa bile)
        showLogin();
        
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Kullanıcı bilgilerini Firebase'den al ve yükle
 * @param {Object} user - Firebase kullanıcı objesi
 * @returns {Promise} - Kullanıcı verileri
 */
async function loadUserData(user) {
    try {
        if (!user || !user.uid) {
            console.warn("Geçerli bir kullanıcı sağlanmadı");
            return null;
        }
        
        if (!firebase || !firebase.firestore) {
            console.warn("Firebase Firestore bulunamadı, kullanıcı bilgileri alınamadı");
            return null;
        }
        
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Kullanıcı bilgilerini global değişkene ata
            window.currentUser = {
                ...user,
                ...userData
            };
            
            // Avatar için kullanıcı adının ilk harfini ayarla
            const avatarElement = document.querySelector('.user-avatar');
            if (avatarElement) {
                avatarElement.textContent = userData.name ? userData.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
            }
            
            console.log("Kullanıcı bilgileri yüklendi:", userData.name);
            
            // Son giriş zamanını güncelle
            firebase.firestore().collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                console.warn("Son giriş zamanı güncellenemedi:", error);
            });
            
            return userData;
        } else {
            console.warn("Kullanıcı verisi bulunamadı, oluşturuluyor");
            
            // Kullanıcı verisini oluştur
            const newUserData = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user'
            };
            
            // Firestore'a kaydet
            await firebase.firestore().collection('users').doc(user.uid).set(newUserData);
            
            // Global değişkene ata
            window.currentUser = {
                ...user,
                ...newUserData
            };
            
            // Avatar için kullanıcı adının ilk harfini ayarla
            const avatarElement = document.querySelector('.user-avatar');
            if (avatarElement) {
                avatarElement.textContent = newUserData.name.charAt(0).toUpperCase();
            }
            
            return newUserData;
        }
    } catch (error) {
        console.error("Kullanıcı verileri yüklenirken hata:", error);
        return null;
    }
}

/**
 * Profil güncelleme
 * @param {Object} userData - Güncellenecek kullanıcı bilgileri
 * @returns {Promise} - Güncelleme işlemi sonucu
 */
async function updateProfile(userData) {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase kontrolü
        if (!firebase || !firebase.firestore) {
            showToast('Demo modunda profil güncelleme işlemi mevcut değil', 'info');
            authState.isProcessing = false;
            return { success: false, error: 'Demo modunda profil güncelleme işlemi mevcut değil' };
        }
        
        // Geçerli kullanıcıyı al
        const user = firebase.auth().currentUser;
        if (!user) {
            showToast('Kullanıcı oturumu bulunamadı', 'error');
            authState.isProcessing = false;
            return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
        }
        
        // Sadece izin verilen alanları güncelle
        const allowedFields = ['name', 'department', 'phone', 'photoURL'];
        const updateData = {};
        
        for (const field of allowedFields) {
            if (userData[field] !== undefined) {
                updateData[field] = userData[field];
            }
        }
        
        // Son güncelleme zamanını ekle
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Kullanıcı bilgilerini güncelle
        await firebase.firestore().collection('users').doc(user.uid).update(updateData);
        
        // Displayname güncelle (Firebase Auth)
        if (userData.name) {
            try {
                await user.updateProfile({
                    displayName: userData.name,
                    ...(userData.photoURL ? { photoURL: userData.photoURL } : {})
                });
            } catch (profileError) {
                console.warn("DisplayName güncellenemedi:", profileError);
            }
        }
        
        // Avatar güncelle (uygulamada)
        if (userData.name) {
            const avatarElement = document.querySelector('.user-avatar');
            if (avatarElement) {
                avatarElement.textContent = userData.name.charAt(0).toUpperCase();
            }
        }
        
        // Eğer e-posta değiştirilmişse (özellikle izin verilmişse)
        if (userData.email && userData.email !== user.email && userData.allowEmailChange) {
            try {
                await user.updateEmail(userData.email);
                updateData.email = userData.email;
                
                // E-posta doğrulama gönder
                await user.sendEmailVerification();
                
                showToast('E-posta adresiniz güncellendi ve doğrulama e-postası gönderildi', 'info');
            } catch (emailError) {
                console.error("E-posta güncellenirken hata:", emailError);
                showToast('E-posta güncellenirken bir hata oluştu: ' + (emailError.message || emailError), 'error');
            }
        }
        
        showToast('Profil bilgileriniz başarıyla güncellendi', 'success');
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        
        return { success: true, updatedData: updateData };
    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        showToast('Profil güncellenirken bir hata oluştu: ' + error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Google ile giriş
 * @returns {Promise} - Google ile giriş işlemi sonucu
 */
async function loginWithGoogle() {
    try {
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        authState.currentProvider = 'google';
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase kontrolü
        if (!firebase || !firebase.auth) {
            showToast('Demo modunda sosyal giriş desteklenmiyor', 'info');
            enableDemoModeWithLoginPrompt();
            authState.isProcessing = false;
            return { success: false, error: 'Demo modunda sosyal giriş desteklenmiyor' };
        }
        
        // Google auth provider
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        // Google ile giriş yap
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        console.log("Google ile giriş başarılı:", user.email);
        
        // Kullanıcı bilgilerini Firestore'dan al veya oluştur
        await loadUserData(user);
        
        // Giriş başarılı mesajı
        showToast(`Hoş geldiniz, ${user.displayName || user.email}`, 'success');
        
        // Ana uygulamayı göster
        showMainApp();
        
        // İlk sayfayı yükle
        showPage(window.currentPage || 'dashboard');
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        
        return { success: true, user };
    } catch (error) {
        console.error("Google giriş hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        // Eğer kullanıcı popup'ı kapattıysa
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Kullanıcı popup'ı kapattı");
            return { success: false, error: 'İşlem iptal edildi', code: error.code };
        }
        
        showToast('Google ile giriş yapılırken bir hata oluştu', 'error');
        return { success: false, error: error.message };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Kullanıcı hesabını sil
 * @param {string} password - Doğrulama için şifre (email provider için)
 * @returns {Promise} - Hesap silme işlemi sonucu
 */
async function deleteAccount(password = null) {
    try {
        // Kullanıcı onayı
        const confirmDelete = confirm("Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.");
        if (!confirmDelete) {
            return { success: false, error: 'İşlem iptal edildi' };
        }
        
        // İşlem durumunu güncelle
        authState.isProcessing = true;
        authState.lastError = null;
        
        // Loading göster
        toggleLoading(true);
        
        // Firebase kontrolü
        if (!firebase || !firebase.auth) {
            showToast('Demo modunda hesap silme işlemi mevcut değil', 'info');
            authState.isProcessing = false;
            return { success: false, error: 'Demo modunda hesap silme işlemi mevcut değil' };
        }
        
        // Geçerli kullanıcıyı al
        const user = firebase.auth().currentUser;
        if (!user) {
            showToast('Kullanıcı oturumu bulunamadı', 'error');
            authState.isProcessing = false;
            return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
        }
        
        // Eğer email/password ile giriş yapıldıysa, şifre doğrulaması yap
        if (user.providerData.some(provider => provider.providerId === 'password') && password) {
            // Mevcut şifreyi doğrula
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            
            // Kullanıcıyı yeniden doğrula
            await user.reauthenticateWithCredential(credential);
        } else if (user.providerData.some(provider => provider.providerId === 'password') && !password) {
            // Email provider ama şifre sağlanmadı
            showToast('Hesabınızı silmek için şifrenizi giriniz', 'warning');
            authState.isProcessing = false;
            return { success: false, error: 'Şifre gerekli', requiresPassword: true };
        }
        
        // Firestore'dan kullanıcı verilerini sil
        if (firebase.firestore) {
            try {
                await firebase.firestore().collection('users').doc(user.uid).delete();
                console.log("Kullanıcı Firestore verileri silindi");
            } catch (firestoreError) {
                console.warn("Kullanıcı Firestore verileri silinirken hata:", firestoreError);
            }
        }
        
        // Kullanıcı hesabını sil
        await user.delete();
        
        showToast('Hesabınız başarıyla silindi', 'success');
        
        // Giriş sayfasına yönlendir
        showLogin();
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        
        return { success: true };
    } catch (error) {
        console.error("Hesap silme hatası:", error);
        
        // Auth durumunu güncelle
        authState.isProcessing = false;
        authState.lastError = error;
        
        let errorMessage = 'Hesap silinirken bir hata oluştu.';
        
        if (error.code) {
            switch(error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Şifreniz hatalı.';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Bu işlem için yakın zamanda giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.';
                    // Çıkış yap
                    await logout();
                    break;
            }
        }
        
        showToast(errorMessage, 'error');
        return { success: false, error: errorMessage };
    } finally {
        // Loading gizle
        toggleLoading(false);
    }
}

/**
 * Kullanıcının rolünü kontrol et (admin, manager, user vb.)
 * @param {string} requiredRole - Gerekli rol
 * @returns {boolean} - Kullanıcının gerekli role sahip olup olmadığı
 */
function checkUserRole(requiredRole) {
    // Geçerli kullanıcıyı kontrol et
    if (!window.currentUser) {
        console.warn("Oturum açmış kullanıcı yok");
        return false;
    }
    
    // Kullanıcı rolünü al
    const userRole = window.currentUser.role || 'user';
    
    // Admin her şeyi yapabilir
    if (userRole === 'admin') {
        return true;
    }
    
    // Rol hiyerarşisi
    const roleHierarchy = {
        'admin': 100,
        'manager': 80,
        'supervisor': 60,
        'editor': 40,
        'user': 20,
        'guest': 10
    };
    
    // Rol puanlarını kontrol et
    const userRoleScore = roleHierarchy[userRole] || 0;
    const requiredRoleScore = roleHierarchy[requiredRole] || 100;
    
    return userRoleScore >= requiredRoleScore;
}

// Eventleri bağla
document.addEventListener('DOMContentLoaded', function() {
    // Giriş formu
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    // Kayıt formu
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            register();
        });
    }
    
    // Şifre sıfırlama formu
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            resetPassword();
        });
    }
    
    // Şifre değiştirme formu
    const passwordChangeForm = document.getElementById('password-change-form');
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('new-password-confirm').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('Tüm alanları doldurunuz', 'warning');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('Yeni şifreler eşleşmiyor', 'warning');
                return;
            }
            
            changePassword(currentPassword, newPassword)
                .then(() => {
                    // Formu temizle
                    passwordChangeForm.reset();
                })
                .catch(error => {
                    console.error("Şifre değiştirme hatası:", error);
                });
        });
    }
    
    // Profil güncelleme formu
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('profile-name').value;
            const department = document.getElementById('profile-department').value;
            const phone = document.getElementById('profile-phone').value;
            
            if (!name) {
                showToast('Ad Soyad alanını doldurunuz', 'warning');
                return;
            }
            
            updateProfile({
                name,
                department,
                phone
            })
                .then(() => {
                    console.log("Profil güncellendi");
                })
                .catch(error => {
                    console.error("Profil güncelleme hatası:", error);
                });
        });
    }
    
    // Google ile giriş butonu
    const googleLoginButton = document.getElementById('google-login-button');
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', function(e) {
            e.preventDefault();
            loginWithGoogle();
        });
    }
    
    // Giriş sayfasındaki demo giriş butonu
    const demoLoginButton = document.querySelector('button[onclick="demoLogin()"]');
    if (demoLoginButton) {
        demoLoginButton.addEventListener('click', function(e) {
            e.preventDefault();
            demoLogin();
        });
    }
});

// Gerekli fonksiyonları dışa aktar
window.login = login;
window.logout = logout;
window.register = register;
window.resetPassword = resetPassword;
window.changePassword = changePassword;
window.updateProfile = updateProfile;
window.loginWithGoogle = loginWithGoogle;
window.deleteAccount = deleteAccount;
window.demoLogin = demoLogin;