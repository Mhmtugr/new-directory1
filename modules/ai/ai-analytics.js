 /**
 * ai-analytics.js
 * Yapay zeka analiz işlevleri
 */

// Tedarik zinciri risk analizi
async function analyzeSupplyChainRisks() {
    try {
        // Firestore'dan malzeme ve sipariş verilerini al
        const materialsRef = firebase.firestore().collection('materials');
        const ordersRef = firebase.firestore().collection('orders');
        
        // Tedarik tarihi geçmiş veya gecikecek malzemeleri bul
        const today = new Date();
        const riskMaterials = [];
        
        const materialsSnapshot = await materialsRef
            .where('inStock', '==', false)
            .get();
            
        for (const doc of materialsSnapshot.docs) {
            const material = doc.data();
            
            if (material.expectedSupplyDate) {
                const supplyDate = new Date(material.expectedSupplyDate.toDate());
                const needDate = material.orderNeedDate ? new Date(material.orderNeedDate.toDate()) : null;
                
                // Risk durumunu belirle
                if (needDate && supplyDate > needDate) {
                    // Kritik risk: Tedarik tarihi ihtiyaç tarihinden sonra
                    riskMaterials.push({
                        id: doc.id,
                        ...material,
                        riskLevel: 'critical',
                        riskReason: 'Tedarik tarihi, ihtiyaç tarihinden sonra'
                    });
                } else if (supplyDate < today) {
                    // Yüksek risk: Tedarik tarihi geçmiş ama hala stokta değil
                    riskMaterials.push({
                        id: doc.id,
                        ...material,
                        riskLevel: 'high',
                        riskReason: 'Tedarik tarihi geçmiş'
                    });
                }
            }
        }
        
        return riskMaterials;
    } catch (error) {
        console.error("Risk analizi hatası:", error);
        throw error;
    }
}

// Üretim optimizasyon önerileri
async function suggestProductionOptimizations() {
    try {
        const ordersRef = firebase.firestore().collection('orders');
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        
        // Gelecek ay içinde teslim edilecek siparişleri getir
        const ordersSnapshot = await ordersRef
            .where('deliveryDate', '>', today)
            .where('deliveryDate', '<', nextMonth)
            .where('status', '!=', 'completed')
            .get();
            
        // Benzer ürün tiplerini grupla
        const productTypes = {};
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (!productTypes[order.cellType]) {
                productTypes[order.cellType] = [];
            }
            productTypes[order.cellType].push({
                id: doc.id,
                ...order
            });
        });
        
        // Optimizasyon önerileri oluştur
        const optimizationSuggestions = [];
        
        for (const [type, orders] of Object.entries(productTypes)) {
            if (orders.length > 1) {
                // Bu tipteki ürünler için paralel üretim önerisi
                optimizationSuggestions.push({
                    cellType: type,
                    orders: orders,
                    orderCount: orders.length,
                    suggestion: `${type} tipi ${orders.length} siparişin üretimini birleştirin`,
                    potentialSavings: Math.round(orders.length * 0.8) // Örnek tasarruf hesabı
                });
            }
        }
        
        return optimizationSuggestions;
    } catch (error) {
        console.error("Optimizasyon önerileri hatası:", error);
        throw error;
    }
}

// Teslim tarihi tahmini
function predictDeliveryDate(cellType, quantity) {
    // Hücre tipine göre ortalama üretim süresi (gün olarak)
    const productionTimes = {
        'RM 36 LB': 15,
        'RM 36 CB': 18,
        'RM 36 FL': 20,
        'default': 20
    };
    
    // Tedarik süresi (malzeme hazırlığı için)
    const supplyTime = 10;
    
    // Test ve kalite kontrol süresi
    const testTime = 5;
    
    // Toplam süre hesabı
    const baseTime = (productionTimes[cellType] || productionTimes['default']);
    const quantityFactor = Math.log2(quantity + 1) * 5; // Logaritmik ölçeklendirme
    
    // Toplam gün
    const totalDays = supplyTime + baseTime + quantityFactor + testTime;
    
    // Bugünden itibaren tahmini teslim tarihi
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + Math.ceil(totalDays));
    
    return {
        estimatedDays: Math.ceil(totalDays),
        supplyPeriod: supplyTime,
        productionPeriod: baseTime + quantityFactor,
        testPeriod: testTime,
        estimatedDeliveryDate: deliveryDate
    };
}

// Yapay zeka önerilerini göster
async function displayAIInsights(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Analizler yükleniyor...</div>';
        
        // Tedarik zinciri riskleri
        const supplyRisks = await analyzeSupplyChainRisks();
        
        // Üretim optimizasyonları
        const optimizations = await suggestProductionOptimizations();
        
        // İçeriği hazırla
        let html = '';
        
        // Kritik tedarik riskleri
        const criticalRisks = supplyRisks.filter(risk => risk.riskLevel === 'critical');
        if (criticalRisks.length > 0) {
            html += `
                <div class="info-box danger">
                    <div class="info-box-title">Kritik Tedarik Uyarısı</div>
                    <div class="info-box-content">
                        <p>${criticalRisks[0].orderName || 'Sipariş'} için ${criticalRisks[0].name} malzemesinin tedarikinde gecikme riski yüksek.
                        Tedarikçiden gelen bilgilere göre, planlanan teslimat ${new Date(criticalRisks[0].expectedSupplyDate.toDate()).toLocaleDateString('tr-TR')} tarihinde, 
                        ancak üretim planında malzemelerin ${new Date(criticalRisks[0].orderNeedDate.toDate()).toLocaleDateString('tr-TR')} tarihinde fabrikada olması gerekiyor.</p>
                        
                        <p><strong>Öneri:</strong> Alternatif tedarikçilerle iletişime geçin veya üretim planını revize edin.</p>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-warning btn-sm" onclick="contactSupplier('${criticalRisks[0].supplierId}')">
                                <i class="fas fa-phone-alt"></i>
                                <span>Tedarikçiyi Ara</span>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="reviseProductionPlan('${criticalRisks[0].orderId}')">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Planı Düzenle</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Optimizasyon önerileri
        if (optimizations.length > 0) {
            html += `
                <div class="info-box">
                    <div class="info-box-title">Üretim Optimizasyonu</div>
                    <div class="info-box-content">
                        <p>${optimizations[0].cellType} tipinde ${optimizations[0].orderCount} farklı sipariş için benzer üretim adımlarını birleştirerek
                        yaklaşık ${optimizations[0].potentialSavings} iş günü tasarruf sağlayabilirsiniz.</p>
                        
                        <button class="btn btn-primary btn-sm" onclick="applyOptimizationPlan()">
                            <i class="fas fa-check-circle"></i>
                            <span>Optimizasyon Planını Uygula</span>
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error("AI insights display error:", error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="info-box danger">
                    <div class="info-box-title">Hata</div>
                    <div class="info-box-content">
                        <p>Yapay zeka önerileri yüklenirken bir hata oluştu: ${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
}