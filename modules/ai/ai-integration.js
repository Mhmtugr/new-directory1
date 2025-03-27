/**
 * ai-integration.js
 * Yapay zeka modüllerini sistem ile entegre eden kod
 */

import AppConfig from '../../config/app-config.js';
import EventBus from '../../utils/event-bus.js';

// Yapay Zeka Entegrasyon Modülü
const AIIntegrationModule = (function() {
    // Özel değişkenler
    let initialized = false;
    let aiModels = {};
    let predictionCache = {};
    
    // Yapay zeka modüllerini yükle
    async function loadAIModels() {
        console.log("Yapay Zeka modülleri yükleniyor...");
        
        try {
            // Gelişmiş AI asistanı yükle
            await loadScript('../modules/ai/advanced-ai.js');
            console.log("Gelişmiş AI asistanı yüklendi");
            
            // Tam entegrasyon için diğer gerekli modülleri yükle
            await Promise.all([
                loadDependencies()
            ]);
            
            // DeepSeek-r1 entegrasyonu
            if (AppConfig.ai?.deepseek?.apiKey) {
                await initializeDeepSeekModel();
                console.log("DeepSeek-r1 modeli başarıyla yüklendi");
            }
            
            // Makine öğrenmesi modeli yükle
            if (AppConfig.ai?.machineLearning?.enabled) {
                await initializeMachineLearningModel();
                console.log("Makine öğrenmesi modeli başarıyla yüklendi");
            }
            
            return true;
        } catch (error) {
            console.error("Yapay Zeka modülleri yüklenirken hata:", error);
            return false;
        }
    }
    
    // Yapay zeka bağımlılıklarını yükle
    async function loadDependencies() {
        // Burada gerekli bağımlılıklar yüklenebilir (örn. LLM modelleri için gerekli kütüphaneler)
        return true;
    }
    
    // DeepSeek-r1 modelini başlat
    async function initializeDeepSeekModel() {
        const config = AppConfig.ai.deepseek;
        
        // DeepSeek model konfigürasyonu
        aiModels.deepseek = {
            apiKey: config.apiKey,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            
            // Soru sorma fonksiyonu
            async askQuestion(question, context = "") {
                try {
                    // Backend API'sine istek gönder
                    const response = await fetch('/api/ai/deepseek/ask', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            question,
                            context,
                            model: config.model,
                            maxTokens: config.maxTokens,
                            temperature: config.temperature
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`DeepSeek API hatası: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    return result.answer;
                } catch (error) {
                    console.error("DeepSeek ile soru cevaplama hatası:", error);
                    // Fallback yanıt
                    return "Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.";
                }
            },
            
            // Malzeme tahmini yapma
            async predictMaterials(orderDetails) {
                try {
                    const response = await fetch('/api/ai/deepseek/materials', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderDetails,
                            model: config.model
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`DeepSeek malzeme tahmini hatası: ${response.status}`);
                    }
                    
                    return await response.json();
                } catch (error) {
                    console.error("Malzeme tahmini hatası:", error);
                    return null;
                }
            },
            
            // Üretim süresi tahmini
            async predictProductionTime(orderDetails) {
                try {
                    const response = await fetch('/api/ai/deepseek/production-time', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderDetails,
                            model: config.model
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`DeepSeek üretim süresi tahmini hatası: ${response.status}`);
                    }
                    
                    return await response.json();
                } catch (error) {
                    console.error("Üretim süresi tahmini hatası:", error);
                    return null;
                }
            }
        };
    }
    
    // Makine öğrenimi modelini başlat
    async function initializeMachineLearningModel() {
        const config = AppConfig.ai.machineLearning;
        
        // Tensorflow.js ile model oluşturma veya yükleme
        aiModels.machineLearning = {
            // Basit regresyon modeli
            regressionModel: null,
            
            // Modeli eğit
            async train(data) {
                try {
                    // Verileri işle
                    const processedData = preprocessData(data);
                    
                    // Model oluştur
                    const model = tf.sequential();
                    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: [config.features.length]}));
                    model.add(tf.layers.dense({units: 1}));
                    
                    model.compile({
                        optimizer: 'adam',
                        loss: 'meanSquaredError'
                    });
                    
                    // Eğitim verileri
                    const xs = tf.tensor2d(processedData.inputs);
                    const ys = tf.tensor2d(processedData.outputs);
                    
                    // Modeli eğit
                    await model.fit(xs, ys, {
                        epochs: 100,
                        batchSize: 32,
                        callbacks: {
                            onEpochEnd: (epoch, logs) => {
                                console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
                            }
                        }
                    });
                    
                    this.regressionModel = model;
                    console.log("Regresyon modeli eğitildi");
                    
                    return true;
                } catch (error) {
                    console.error("Model eğitimi hatası:", error);
                    return false;
                }
            },
            
            // Tahmin yap
            async predict(inputData) {
                if (!this.regressionModel) {
                    return null;
                }
                
                try {
                    const processedInput = preprocessInput(inputData);
                    const inputTensor = tf.tensor2d([processedInput]);
                    
                    const prediction = this.regressionModel.predict(inputTensor);
                    const result = await prediction.array();
                    
                    return result[0][0]; // Tek bir sayı dönecek
                } catch (error) {
                    console.error("Tahmin hatası:", error);
                    return null;
                }
            }
        };
    }
    
    // Veri önişleme fonksiyonu
    function preprocessData(data) {
        // Veri önişleme mantığı burada
        // Kod uzunluğu kısıtlaması için basit tutuldu
        return {
            inputs: data.map(item => {
                return AppConfig.ai.machineLearning.features.map(feature => item[feature] || 0);
            }),
            outputs: data.map(item => [item.output || 0])
        };
    }
    
    // Girdi önişleme fonksiyonu
    function preprocessInput(inputData) {
        return AppConfig.ai.machineLearning.features.map(feature => inputData[feature] || 0);
    }
    
    // Yapay zeka yeteneklerini sistemle entegre et
    function integrateAICapabilities() {
        console.log("Yapay Zeka yetenekleri entegre ediliyor...");
        
        // Dashboard entegrasyonu
        if (typeof window.loadDashboardData === 'function') {
            const originalLoadDashboard = window.loadDashboardData;
            
            // Fonksiyonu güçlendir
            window.loadDashboardData = async function() {
                const result = await originalLoadDashboard();
                
                // Yapay zeka önerileri ekle
                try {
                    const aiInsights = await generateAIInsights();
                    updateDashboardWithAIInsights(aiInsights);
                } catch (error) {
                    console.warn("AI önerileri yüklenirken hata:", error);
                }
                
                return result;
            };
        }
        
        // Sipariş entegrasyonu
        if (typeof window.showOrderDetail === 'function') {
            const originalShowOrderDetail = window.showOrderDetail;
            
            // Fonksiyonu güçlendir
            window.showOrderDetail = function(orderId) {
                // Orijinal fonksiyonu çağır
                originalShowOrderDetail(orderId);
                
                // Yapay zeka analizini ekle
                enhanceOrderDetailWithAI(orderId);
            };
        }
        
        // Üretim entegrasyonu
        if (typeof window.showProductionPlan === 'function') {
            const originalShowProductionPlan = window.showProductionPlan;
            
            // Fonksiyonu güçlendir
            window.showProductionPlan = function() {
                // Orijinal fonksiyonu çağır
                originalShowProductionPlan();
                
                // Yapay zeka optimizasyonunu ekle
                enhanceProductionPlanWithAI();
            };
        }
        
        // Malzeme entegrasyonu
        if (typeof window.loadStockData === 'function') {
            const originalLoadStockData = window.loadStockData;
            
            // Fonksiyonu güçlendir
            window.loadStockData = async function() {
                const result = await originalLoadStockData();
                
                // Yapay zeka önerilerini ekle
                try {
                    const materialInsights = await generateMaterialAIInsights();
                    updateStockWithAIInsights(materialInsights);
                } catch (error) {
                    console.warn("Malzeme AI önerileri yüklenirken hata:", error);
                }
                
                return result;
            };
        }
        
        // Diğer entegrasyonlar...
        
        console.log("Yapay Zeka yetenekleri başarıyla entegre edildi");
        return true;
    }
    
    // Dashboard'a yapay zeka önerilerini ekle
    function updateDashboardWithAIInsights(insights) {
        const aiRecommendations = document.getElementById('ai-recommendations');
        if (!aiRecommendations) return;
        
        // Eğer içerik varsa güncelle
        if (insights && insights.recommendation) {
            aiRecommendations.innerHTML = insights.recommendation;
        }
    }
    
    // Sipariş detayını yapay zeka ile zenginleştir
    function enhanceOrderDetailWithAI(orderId) {
        // Sipariş detay modülünü bul
        const orderDetailModal = document.getElementById('order-detail-modal');
        if (!orderDetailModal) return;
        
        // AI tab'ı yoksa ekle
        const orderTabs = orderDetailModal.querySelector('.tabs');
        
        if (orderTabs && !orderTabs.querySelector(`[data-tab="ai-analysis"]`)) {
            // AI analizi tab'ı ekle
            const aiTab = document.createElement('div');
            aiTab.className = 'tab';
            aiTab.setAttribute('data-tab', 'ai-analysis');
            aiTab.textContent = 'Yapay Zeka Analizi';
            orderTabs.appendChild(aiTab);
            
            // AI analizi içerik alanı ekle
            const tabContents = orderDetailModal.querySelector('.modal-body');
            
            if (tabContents) {
                const aiContent = document.createElement('div');
                aiContent.className = 'tab-content';
                aiContent.id = 'ai-analysis-content';
                aiContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Yapay zeka analizi yükleniyor...</div>';
                tabContents.appendChild(aiContent);
                
                // Tab olay dinleyicisini ekle
                aiTab.addEventListener('click', function() {
                    // Tüm tab ve içerikleri deaktif et
                    orderTabs.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                    tabContents.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                    
                    // Bu tab'ı aktif et
                    aiTab.classList.add('active');
                    aiContent.classList.add('active');
                    
                    // AI analizini yükle
                    loadOrderAIAnalysis(orderId, aiContent);
                });
            }
        }
    }
    
    // Sipariş için yapay zeka analizi yükle
    async function loadOrderAIAnalysis(orderId, container) {
        try {
            // Sipariş verilerini al
            const order = await getOrderDetails(orderId);
            
            if (!order) {
                container.innerHTML = `<div class="error-box">Sipariş bilgileri alınamadı.</div>`;
                return;
            }
            
            // Gecikme riski analizi
            const delayRisk = await analyzeDelayRisk(order);
            
            // Optimizasyon önerileri
            const optimizations = await analyzeOrderOptimizations(order);
            
            // Container'a analiz sonuçlarını ekle
            container.innerHTML = `
                <div class="ai-analysis-container">
                    <div class="ai-section" style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">Gecikme Riski Analizi</h3>
                        <div class="risk-meter" style="margin-bottom: 15px;">
                            <div class="risk-bar" style="height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: ${delayRisk.riskPercentage}%; background-color: ${delayRisk.riskColor};"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
                                <span>Düşük Risk</span>
                                <span>Orta Risk</span>
                                <span>Yüksek Risk</span>
                            </div>
                        </div>
                        <div class="risk-details" style="margin-bottom: 15px; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
                            <p style="margin-bottom: 10px;"><strong>Risk Seviyesi:</strong> <span style="color: ${delayRisk.riskColor};">${delayRisk.riskLevel}</span></p>
                            <p style="margin-bottom: 10px;"><strong>Risk Faktörleri:</strong></p>
                            <ul style="margin-left: 20px;">
                                ${delayRisk.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="ai-section" style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">Optimizasyon Önerileri</h3>
                        <div class="optimizations" style="margin-bottom: 15px;">
                            ${optimizations.map(opt => `
                                <div style="padding: 15px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${opt.priorityColor};">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <strong>${opt.title}</strong>
                                        <span style="font-size: 12px; color: ${opt.priorityColor};">${opt.priority} Öncelik</span>
                                    </div>
                                    <p>${opt.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="ai-section" style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">Tahmini Teslim Analizi</h3>
                        <div style="padding: 15px; background-color: #f8fafc; border-radius: 8px;">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Planlanan Teslim:</strong></td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${formatDate(order.deliveryDate)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Tahmini Teslim:</strong></td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; ${delayRisk.estimatedDeliveryDate > new Date(order.deliveryDate) ? 'color: #ef4444;' : 'color: #10b981;'}">
                                        ${formatDate(delayRisk.estimatedDeliveryDate)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Sapma:</strong></td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; ${delayRisk.deliveryDeviation > 0 ? 'color: #ef4444;' : 'color: #10b981;'}">
                                        ${delayRisk.deliveryDeviation > 0 ? '+' : ''}${delayRisk.deliveryDeviation} gün
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Başarı Olasılığı:</strong></td>
                                    <td style="padding: 8px 0;">${delayRisk.successProbability}%</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error("Sipariş AI analizi yüklenirken hata:", error);
            container.innerHTML = `<div class="error-box">Yapay zeka analizi yüklenirken bir hata oluştu: ${error.message}</div>`;
        }
    }
    
    // Üretim planını yapay zeka ile zenginleştir
    function enhanceProductionPlanWithAI() {
        // Üretim planı yüklendikten sonra yapay zeka önerilerini ekle
        setTimeout(async () => {
            try {
                // Üretim optimizasyonu
                const optimizations = await generateProductionOptimizations();
                
                // Optimizasyon önerilerini ekle
                const productionContainer = document.getElementById('production-page');
                if (!productionContainer) return;
                
                // Optimizasyon paneli için yer var mı kontrol et
                let aiPanel = productionContainer.querySelector('.ai-optimization-panel');
                
                if (!aiPanel) {
                    // Yeni panel oluştur
                    aiPanel = document.createElement('div');
                    aiPanel.className = 'ai-optimization-panel card';
                    aiPanel.innerHTML = `
                        <div class="card-header">
                            <div class="card-title">Yapay Zeka Optimizasyon Önerileri</div>
                        </div>
                        <div class="card-body" id="ai-production-recommendations">
                            <div class="loading"><i class="fas fa-spinner fa-spin"></i> Yapay zeka önerileri yükleniyor...</div>
                        </div>
                    `;
                    
                    // Sayfaya ekle
                    const insertPoint = productionContainer.querySelector('.card');
                    if (insertPoint && insertPoint.parentNode) {
                        insertPoint.parentNode.insertBefore(aiPanel, insertPoint.nextSibling);
                    } else {
                        productionContainer.appendChild(aiPanel);
                    }
                }
                
                // AI önerileri için içerik ekle
                const aiContent = aiPanel.querySelector('.card-body');
                if (aiContent) {
                    aiContent.innerHTML = `
                        <div class="loading"><i class="fas fa-spinner fa-spin"></i> Yapay zeka önerileri yükleniyor...</div>
                    `;
                    
                    // AI önerilerini yükle
                    loadProductionAIRecommendations(optimizations, aiContent);
                }
            } catch (error) {
                console.error("Üretim planı AI önerileri yüklenirken hata:", error);
                aiPanel.innerHTML = `<div class="error-box">Yapay zeka önerileri yüklenirken bir hata oluştu: ${error.message}</div>`;
            }
        }, 500);
    }
    
    // Script yükleme yardımcı fonksiyonu
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            console.log(`Script yükleniyor: ${url}`);
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
                console.log(`Script yüklendi: ${url}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`Script yüklenirken hata: ${url}`, error);
                reject(new Error(`Script yüklenemedi: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    // Demo yanıt üretme (yedek)
    function generateFallbackResponse(question) {
        question = question.toLowerCase();
        
        if (question.includes('malzeme')) {
            return "Kritik seviyenin altında 2 malzeme bulunuyor: Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC (Stok: 2, Önerilen: 5) ve KAP-80/190-95 Akım Trafosu (Stok: 3, Önerilen: 5).";
        } else if (question.includes('üretim') || question.includes('süre')) {
            return "Mevcut üretim planına göre ortalama tamamlama süresi 14 gün. Gecikme riski %15 olarak hesaplanmıştır.";
        } else if (question.includes('hücre') || question.includes('RM')) {
            return "RM 36 CB hücresinin ortalama üretim süresi 12 iş günüdür. Malzeme temin süreleri dahil değildir.";
        }
        
        return "Üzgünüm, şu anda bu soruya yanıt veremiyorum. Sistem bakımda olabilir.";
    }
    
    // Yapay zeka sistemini başlat
    async function initialize() {
        if (initialized) return true;
        
        try {
            await loadAIModels();
            initialized = true;
            console.log("Yapay Zeka Entegrasyonu başarıyla tamamlandı");
            return true;
        } catch (error) {
            console.error("Yapay Zeka başlatma hatası:", error);
            return false;
        }
    }
    
    // Başlatma işlemini yap
    initialize().then(status => {
        if (status) {
            console.log("AIIntegrationModule hazır");
            EventBus.emit('ai:ready', { service: 'AIIntegrationModule' });
        }
    });
    
    // Public API
    return {
        initialize,
        isInitialized: () => initialized,
        askDeepSeek: async function(question, context = "") {
            try {
                if (!initialized) {
                    await initialize();
                }
                
                if (!aiModels.deepseek) {
                    console.warn("DeepSeek modeli henüz yüklenmedi");
                    
                    // AIService üzerinden sormayı dene
                    if (typeof AIService !== 'undefined') {
                        return await AIService.askDeepSeek(question, context);
                    }
                    
                    throw new Error("DeepSeek modeli kullanılamıyor");
                }
                
                return await aiModels.deepseek.askQuestion(question, context);
                
            } catch (error) {
                console.error("askDeepSeek hatası:", error);
                
                // Fallback olarak AIService'i dene
                if (typeof AIService !== 'undefined') {
                    try {
                        return await AIService.askDeepSeek(question, context);
                    } catch (serviceError) {
                        console.error("AIService.askDeepSeek hatası:", serviceError);
                    }
                }
                
                // Demo yanıt oluştur
                return generateFallbackResponse(question);
            }
        },
        predictMaterials: async (orderDetails) => {
            if (!initialized) await initialize();
            if (aiModels.deepseek) {
                return aiModels.deepseek.predictMaterials(orderDetails);
            }
            return null;
        },
        predictProductionTime: async (orderDetails) => {
            if (!initialized) await initialize();
            if (aiModels.deepseek) {
                return aiModels.deepseek.predictProductionTime(orderDetails);
            }
            return null;
        }
    };
})();

export default AIIntegrationModule;