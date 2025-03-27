/**
 * chatbot.js
 * Yapay zeka asistanı işlevleri
 */

import AppConfig from '../../config/app-config.js';
import AdvancedAI from './advanced-ai.js';
import AIIntegrationModule from './ai-integration.js';

// Chatbot penceresini göster/gizle
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbot-window');
    if (chatbotWindow.style.display === 'flex') {
        chatbotWindow.style.display = 'none';
    } else {
        chatbotWindow.style.display = 'flex';
        document.getElementById('chatbot-input').focus();
    }
}

// Mesaj gönderme
async function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Kullanıcı mesajını ekle
    const chatBody = document.getElementById('chatbot-body');
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'chat-message user';
    userMessageElement.textContent = message;
    chatBody.appendChild(userMessageElement);
    
    // Input'u temizle
    input.value = '';
    
    // Yanıt oluşturma (yapay zeka ile entegrasyon)
    await generateBotResponse(message, chatBody);
    
    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Yapay zeka yanıtı oluşturma
async function generateBotResponse(message, chatBody) {
    // Yükleniyor göster
    const loadingElement = document.createElement('div');
    loadingElement.className = 'chat-message bot';
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Yanıt hazırlanıyor...';
    chatBody.appendChild(loadingElement);
    
    try {
        // AI modunu belirle ve yanıt al
        let botResponse = '';
        
        // Gerçek AI modeli ile veri topla
        const context = await collectContextData(message);
        
        // Öncelik sırası: DeepSeek -> AdvancedAI -> Demo
        if (AppConfig.ai?.deepseek?.apiKey && AIIntegrationModule) {
            // DeepSeek Entegrasyonu
            botResponse = await AIIntegrationModule.askDeepSeek(message, context);
        } else if (AdvancedAI) {
            // Yerleşik AdvancedAI modülü
            botResponse = await AdvancedAI.askQuestion(message, context);
        } else {
            // Demo yanıt mantığı (fallback)
            botResponse = generateDemoResponse(message);
        }
        
        // Yükleniyor mesajını kaldır
        chatBody.removeChild(loadingElement);
        
        // Gerçek yanıtı ekle
        const botMessageElement = document.createElement('div');
        botMessageElement.className = 'chat-message bot';
        botMessageElement.textContent = botResponse;
        chatBody.appendChild(botMessageElement);
        
        // Yanıtın içeriğine göre eylem öner
        suggestActionsBasedOnResponse(message, botResponse, chatBody);
        
    } catch (error) {
        console.error("Chatbot yanıt hatası:", error);
        
        // Hata durumunda
        chatBody.removeChild(loadingElement);
        const errorElement = document.createElement('div');
        errorElement.className = 'chat-message bot';
        errorElement.textContent = 'Üzgünüm, yanıt oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.';
        chatBody.appendChild(errorElement);
    }
}

// İlgili bağlam verilerini topla
async function collectContextData(message) {
    let context = "";
    
    try {
        // Soru içeriğine göre bağlam verilerini topla
        if (message.toLowerCase().includes('sipariş') || message.toLowerCase().includes('order')) {
            // Aktif siparişleri al
            const orders = await fetchActiveOrders();
            if (orders && orders.length > 0) {
                context += "Aktif Siparişler:\n";
                orders.forEach((order, index) => {
                    context += `${index + 1}. ${order.orderNumber} - ${order.customer} - ${order.cellType} - ${order.status}\n`;
                });
            }
        }
        
        if (message.toLowerCase().includes('malzeme') || message.toLowerCase().includes('material') || message.toLowerCase().includes('stok')) {
            // Kritik malzemeleri al
            const materials = await fetchCriticalMaterials();
            if (materials && materials.length > 0) {
                context += "\nKritik Malzemeler:\n";
                materials.forEach((material, index) => {
                    context += `${index + 1}. ${material.code} - ${material.name} - Stok: ${material.stock}, Gerekli: ${material.required}\n`;
                });
            }
        }
        
        if (message.toLowerCase().includes('üretim') || message.toLowerCase().includes('production')) {
            // Üretim durumunu al
            const production = await fetchProductionStatus();
            if (production) {
                context += "\nÜretim Durumu:\n";
                context += `Devam Eden: ${production.inProgress}\n`;
                context += `Geciken: ${production.delayed}\n`;
                context += `Tamamlanan (bu ay): ${production.completed}\n`;
            }
        }
        
        return context;
        
    } catch (error) {
        console.error("Bağlam verisi toplanırken hata:", error);
        return "";
    }
}

// Aktif siparişleri getir
async function fetchActiveOrders() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return [
            { orderNumber: "0424-1251", customer: "AYEDAŞ", cellType: "RM 36 CB", status: "Üretimde" },
            { orderNumber: "0424-1245", customer: "BEDAŞ", cellType: "RM 36 CB", status: "Malzeme Bekliyor" },
            { orderNumber: "0424-1239", customer: "TEİAŞ", cellType: "RM 36 LB", status: "Üretimde" }
        ];
    } catch (error) {
        console.error("Sipariş verileri alınırken hata:", error);
        return [];
    }
}

// Kritik malzemeleri getir
async function fetchCriticalMaterials() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return [
            { code: "137998%", name: "Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC", stock: 2, required: 8 },
            { code: "144866%", name: "KAP-80/190-95 Akım Trafosu", stock: 3, required: 5 },
            { code: "120170%", name: "M480TB/G-027-95.300UN5 Kablo Başlığı", stock: 12, required: 15 }
        ];
    } catch (error) {
        console.error("Malzeme verileri alınırken hata:", error);
        return [];
    }
}

// Üretim durumunu getir
async function fetchProductionStatus() {
    try {
        // Gerçek uygulamada API çağrısı yapılır
        // Demo amaçlı sabit veri
        return {
            inProgress: 18,
            delayed: 3,
            completed: 42
        };
    } catch (error) {
        console.error("Üretim durumu alınırken hata:", error);
        return null;
    }
}

// Demo yanıt oluştur (Yapay Zeka mevcut değilse)
function generateDemoResponse(message) {
    message = message.toLowerCase();
    
    if (message.includes('merhaba') || message.includes('selam')) {
        return 'Merhaba! Size nasıl yardımcı olabilirim?';
    } else if (message.includes('sipariş') && message.includes('durum')) {
        return 'Aktif siparişlerinizi kontrol ediyorum... AYEDAŞ siparişi (24-03-A001) üretim aşamasında, BAŞKENT EDAŞ siparişi (24-03-B002) için malzeme tedarik sorunu bulunuyor.';
    } else if (message.includes('malzeme') || message.includes('stok')) {
        return 'Stok durumunu kontrol ediyorum... Kablo başlıkları ve gerilim gösterge malzemelerinde eksiklik var. Satın alma departmanı tedarik işlemlerini yürütüyor.';
    } else if (message.includes('gecikme') || message.includes('risk')) {
        return 'BAŞKENT EDAŞ siparişi (24-03-B002) için kablo başlıkları tedarikinde gecikme riski yüksek. Tedarikçiden gelen bilgilere göre, planlanan teslimat üretim planından daha geç. Alternatif tedarikçilerle iletişime geçmenizi öneririm.';
    } else if (message.includes('üretim') || message.includes('plan')) {
        return 'Mevcut üretim planına göre, Mayıs ayında 3 siparişin üretimi devam ediyor. AYEDAŞ siparişi 8 Mayıs\'da, BAŞKENT EDAŞ siparişi 15 Mayıs\'da, ENERJİSA siparişi 10 Haziran\'da teslim edilecek şekilde planlandı.';
    } else if (message.includes('öneri') || message.includes('optimizasyon')) {
        return 'Mayıs ayı siparişleri için üretim optimizasyonu öneriyorum. RM 36 LB tipi hücreler için üretim süreçlerini paralel planlayarak yaklaşık 5 iş günü kazanç sağlayabilirsiniz. Detaylı planı görmek ister misiniz?';
    } else if (message.includes('tedarikçi') || message.includes('satın')) {
        return 'Gerilim gösterge malzemesi için alternatif tedarikçi önerilerim: Elektra (2 gün teslimat, %5 daha pahalı), Siemens (5 gün teslimat, standart fiyat), ABB (acil teslimat mümkün, %10 daha pahalı). Hangisiyle iletişime geçmek istersiniz?';
    } else if (message.includes('müşteri') || message.includes('iletişim')) {
        return 'Müşteri bilgilerini getiriyorum... AYEDAŞ: Ahmet Yılmaz (0212 555 11 22), ENERJİSA: Mehmet Kaya (0216 333 44 55), BAŞKENT EDAŞ: Ayşe Demir (0312 444 77 88), TOROSLAR EDAŞ: Fatma Şahin (0322 666 99 00)';
    } else if (message.includes('yardım') || message.includes('ne yapabilir')) {
        return 'Size şu konularda yardımcı olabilirim: sipariş durumlarını kontrol etme, stok/malzeme durumunu sorgulama, üretim planlarını görüntüleme, optimizasyon önerileri sunma, tedarikçi bilgilerini getirme ve müşteri iletişim bilgilerini sağlama.';
    } else {
        return 'Özür dilerim, sorunuzu tam olarak anlayamadım. Siparişler, üretim planı, malzeme durumu veya optimizasyon önerileri hakkında bilgi almak için daha açık bir soru sorabilir misiniz?';
    }
}

// Yanıta göre eylemler öner
function suggestActionsBasedOnResponse(message, response, chatBody) {
    const actionTypes = [];
    
    // Mesaj içeriğine göre eylem tipi belirle
    if (message.toLowerCase().includes('sipariş') || response.toLowerCase().includes('sipariş')) {
        actionTypes.push('orders');
    }
    
    if (message.toLowerCase().includes('malzeme') || response.toLowerCase().includes('malzeme') || 
        message.toLowerCase().includes('stok') || response.toLowerCase().includes('stok')) {
        actionTypes.push('materials');
    }
    
    if (message.toLowerCase().includes('üretim') || response.toLowerCase().includes('üretim') ||
        message.toLowerCase().includes('gecikme') || response.toLowerCase().includes('gecikme')) {
        actionTypes.push('production');
    }
    
    // Hiç eylem belirlenemediyse çık
    if (actionTypes.length === 0) return;
    
    // Eylem butonları oluştur
    const actionsElement = document.createElement('div');
    actionsElement.className = 'chat-actions';
    
    if (actionTypes.includes('orders')) {
        const orderBtn = document.createElement('button');
        orderBtn.className = 'btn btn-sm btn-outline-primary';
        orderBtn.textContent = 'Siparişleri Görüntüle';
        orderBtn.onclick = () => { window.location.hash = '#orders'; };
        actionsElement.appendChild(orderBtn);
    }
    
    if (actionTypes.includes('materials')) {
        const materialsBtn = document.createElement('button');
        materialsBtn.className = 'btn btn-sm btn-outline-primary';
        materialsBtn.textContent = 'Malzeme Durumunu Gör';
        materialsBtn.onclick = () => { window.location.hash = '#materials'; };
        actionsElement.appendChild(materialsBtn);
    }
    
    if (actionTypes.includes('production')) {
        const productionBtn = document.createElement('button');
        productionBtn.className = 'btn btn-sm btn-outline-primary';
        productionBtn.textContent = 'Üretim Takibine Git';
        productionBtn.onclick = () => { window.location.hash = '#production'; };
        actionsElement.appendChild(productionBtn);
    }
    
    // Eylem butonlarını mesaj akışına ekle
    chatBody.appendChild(actionsElement);
}

// Sayfa yüklendiğinde eventleri bağla
document.addEventListener('DOMContentLoaded', function() {
    // Chatbot trigger butonu için tıklama olayı
    const chatbotTrigger = document.querySelector('.chatbot-trigger') || document.getElementById('ai-chatbot-btn');
    if (chatbotTrigger) {
        chatbotTrigger.addEventListener('click', toggleChatbot);
    }
    
    // Chatbot kapatma butonu için tıklama olayı
    const chatbotClose = document.querySelector('.chatbot-close');
    if (chatbotClose) {
        chatbotClose.addEventListener('click', toggleChatbot);
    }
    
    // Mesaj gönderme butonu için tıklama olayı
    const chatbotSend = document.querySelector('.chatbot-send');
    if (chatbotSend) {
        chatbotSend.addEventListener('click', sendChatMessage);
    }
    
    // Enter tuşu ile mesaj gönderme
    const chatbotInput = document.getElementById('chatbot-input');
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Chatbot penceresini oluştur (sayfada yoksa)
    createChatbotUIIfNeeded();
});

// Chatbot arayüzünü oluştur
function createChatbotUIIfNeeded() {
    if (!document.getElementById('chatbot-window')) {
        const chatbotUI = document.createElement('div');
        chatbotUI.id = 'chatbot-window';
        chatbotUI.className = 'chatbot-container';
        chatbotUI.style.display = 'none';
        
        chatbotUI.innerHTML = `
            <div class="chatbot-header">
                <h5>MehmetEndüstriyelTakip AI Asistanı</h5>
                <button class="chatbot-close btn btn-sm"><i class="bi bi-x-lg"></i></button>
            </div>
            <div id="chatbot-body" class="chatbot-body">
                <div class="chat-message bot">
                    Merhaba! Ben MehmetEndüstriyelTakip AI Asistanı. Size üretim takibi, sipariş durumları, stok durumu ve teknik konularda yardımcı olabilirim. Nasıl yardımcı olabilirim?
                </div>
            </div>
            <div class="chatbot-footer">
                <input type="text" id="chatbot-input" class="form-control" placeholder="Sorunuzu yazın...">
                <button class="chatbot-send btn btn-primary"><i class="bi bi-send"></i></button>
            </div>
        `;
        
        document.body.appendChild(chatbotUI);
        
        // Olay dinleyicileri ekle
        chatbotUI.querySelector('.chatbot-close').addEventListener('click', toggleChatbot);
        chatbotUI.querySelector('.chatbot-send').addEventListener('click', sendChatMessage);
        chatbotUI.querySelector('#chatbot-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
}

// Dışa açılan fonksiyonlar
export { toggleChatbot, sendChatMessage, generateBotResponse };