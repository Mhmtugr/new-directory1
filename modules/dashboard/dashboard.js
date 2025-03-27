/**
 * dashboard.js
 * Kontrol paneli işlevleri ve veri yönetimi
 */

// Dashboard durum değişkenleri
const dashboardState = {
    isLoading: false,
    lastUpdate: null,
    activeFilters: {},
    charts: {},
    lastError: null,
    datasources: {}
};

// Yardımcı bileşen referansları
const dashboardElements = {
    statsGrid: null,
    ordersTable: null,
    upcomingDeliveriesTable: null,
    missingMaterialsTable: null,
    orderChart: null,
    customerChart: null,
    aiRecommendations: null
};

/**
 * Dashboard verilerini yükle - Ana işlev
 * @returns {Promise<Object>} Yüklenen veriler
 */
async function loadDashboardData() {
    try {
        console.log("Dashboard verileri yükleniyor...");
        
        // İşlem durumunu güncelle
        dashboardState.isLoading = true;
        
        // Loading göster
        showLoadingInPage('dashboard-page');
        
        // Dashboard elementlerini belirle
        initDashboardElements();
        
        // Paralel veri yükleme işlemleri
        const [stats, activeOrders, missingMaterials, upcomingDeliveries] = await Promise.all([
            loadDashboardStats(),
            loadActiveOrders(),
            loadMissingMaterials(),
            loadUpcomingDeliveries()
        ]);
        
        // Grafikleri çizdir
        drawDashboardCharts();
        
        // Yapay zeka önerilerini yükle
        if (typeof displayAIInsights === 'function') {
            try {
                await displayAIInsights('ai-recommendations');
            } catch (error) {
                console.warn("Yapay zeka önerileri yüklenirken hata oluştu:", error);
            }
        }
        
        // İşlem durumunu güncelle
        dashboardState.isLoading = false;
        dashboardState.lastUpdate = new Date();
        
        // Loading gizle
        hideLoadingInPage('dashboard-page');
        
        // Sonuçları döndür
        return {
            stats,
            activeOrders,
            missingMaterials,
            upcomingDeliveries
        };
    } catch (error) {
        console.error('Dashboard verileri yüklenirken hata:', error);
        
        // İşlem durumunu güncelle
        dashboardState.isLoading = false;
        dashboardState.lastError = error;
        
        // Hata mesajı göster
        showErrorInPage('dashboard-page', 'Dashboard Verileri Yüklenemedi', error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        
        // Yine de bazı verileri göster - demo verileri
        loadDashboardDemo();
        
        // Hata nesnesi ile Promise reddet
        throw error;
    }
}

/**
 * Dashboard elementlerini belirle
 */
function initDashboardElements() {
    // Ana bileşenlerin referanslarını al
    dashboardElements.statsGrid = document.querySelector('.stats-grid');
    dashboardElements.ordersTable = document.querySelector('#orders-table tbody');
    dashboardElements.upcomingDeliveriesTable = document.querySelector('#upcoming-deliveries-table tbody');
    dashboardElements.missingMaterialsTable = document.querySelector('#missing-materials-table tbody');
    dashboardElements.aiRecommendations = document.getElementById('ai-recommendations');
    
    // Canvas elementlerini kontrol et
    const orderChartCanvas = document.getElementById('orderChart');
    const customerChartCanvas = document.getElementById('customerChart');
    
    if (orderChartCanvas && !dashboardElements.orderChart) {
        dashboardElements.orderChart = orderChartCanvas.getContext('2d');
    }
    
    if (customerChartCanvas && !dashboardElements.customerChart) {
        dashboardElements.customerChart = customerChartCanvas.getContext('2d');
    }
}

/**
 * Demo dashboard verilerini yükle
 */
function loadDashboardDemo() {
    console.log("Demo dashboard verileri yükleniyor...");
    
    // İstatistik verilerini güncelle
    const statsData = {
        activeOrders: 24,
        missingMaterials: 8,
        delayedOrders: 3,
        thisMonthDelivery: 12
    };
    
    updateStatCards(statsData);
    
    // Grafikleri çizdir
    drawDashboardCharts();
    
    // Aktif siparişleri yükle
    if (dashboardElements.ordersTable) {
        const demoOrders = getDemoOrders();
        let ordersHTML = generateOrdersTableHTML(demoOrders);
        dashboardElements.ordersTable.innerHTML = ordersHTML;
    }
    
    // Yaklaşan teslimatları yükle
    if (dashboardElements.upcomingDeliveriesTable) {
        const demoDeliveries = getDemoUpcomingDeliveries();
        let deliveriesHTML = generateUpcomingDeliveriesHTML(demoDeliveries);
        dashboardElements.upcomingDeliveriesTable.innerHTML = deliveriesHTML;
    }
    
    // Eksik malzemeleri yükle
    if (dashboardElements.missingMaterialsTable) {
        const demoMissingMaterials = getDemoMissingMaterials();
        let materialsHTML = generateMissingMaterialsHTML(demoMissingMaterials);
        dashboardElements.missingMaterialsTable.innerHTML = materialsHTML;
    }
    
    // Yapay zeka önerileri
    if (dashboardElements.aiRecommendations) {
        const demoRecommendationHTML = `
            <div class="info-box">
                <div class="info-box-title">Üretim Optimizasyonu</div>
                <div class="info-box-content">
                    <p>RM 36 LB tipinde 3 farklı sipariş için benzer üretim adımlarını birleştirerek yaklaşık 5 iş günü tasarruf sağlayabilirsiniz.</p>
                    <button class="btn btn-primary btn-sm" onclick="applyOptimizationPlan()">
                        <i class="fas fa-check-circle"></i>
                        <span>Optimizasyon Planını Uygula</span>
                    </button>
                </div>
            </div>
        `;
        
        dashboardElements.aiRecommendations.innerHTML = demoRecommendationHTML;
    }
}

/**
 * Dashboard istatistik verilerini yükle
 * @returns {Promise<Object>} İstatistik verileri
 */
async function loadDashboardStats() {
    try {
        if (firebase && firebase.firestore) {
            // Firebase sorguları
            const activeOrdersQuery = firebase.firestore().collection('orders').where('status', '!=', 'completed');
            const missingMaterialsQuery = firebase.firestore().collection('materials').where('inStock', '==', false);
            
            // Paralel sorgular çalıştır
            const [activeOrdersSnapshot, missingMaterialsSnapshot] = await Promise.all([
                activeOrdersQuery.get(),
                missingMaterialsQuery.get()
            ]);
            
            // Mevcut tarihi kullanacak hesaplamalar
            const today = new Date();
            let delayedOrdersCount = 0;
            let thisMonthDeliveryCount = 0;
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Aktif siparişleri döngüye alarak gecikmiş ve bu ay teslim edilecekleri bul
            activeOrdersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.deliveryDate) {
                    const deliveryDate = data.deliveryDate.toDate ? data.deliveryDate.toDate() : new Date(data.deliveryDate);
                    
                    // Gecikmiş siparişleri kontrol et
                    if (deliveryDate < today && data.status !== 'completed') {
                        delayedOrdersCount++;
                    }
                    
                    // Bu ay teslim edilecekleri kontrol et
                    if (deliveryDate.getMonth() === currentMonth && 
                        deliveryDate.getFullYear() === currentYear) {
                        thisMonthDeliveryCount++;
                    }
                }
            });
            
            // İstatistik verileri
            const statsData = {
                activeOrders: activeOrdersSnapshot.size,
                missingMaterials: missingMaterialsSnapshot.size,
                delayedOrders: delayedOrdersCount,
                thisMonthDelivery: thisMonthDeliveryCount
            };
            
            // İstatistik kartlarını güncelle
            updateStatCards(statsData);
            return statsData;
        } else {
            // Demo verileri
            const statsData = {
                activeOrders: 24,
                missingMaterials: 8,
                delayedOrders: 3,
                thisMonthDelivery: 12
            };
            
            // İstatistik kartlarını güncelle
            updateStatCards(statsData);
            return statsData;
        }
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
        
        // Demo veriler ile devam et
        const statsData = {
            activeOrders: 24,
            missingMaterials: 8,
            delayedOrders: 3,
            thisMonthDelivery: 12
        };
        
        // İstatistik kartlarını güncelle
        updateStatCards(statsData);
        return statsData;
    }
}

/**
 * İstatistik kartlarını güncelle
 * @param {Object} stats - İstatistik verileri
 */
function updateStatCards(stats) {
    // Elementleri seç ve her birini güncelle
    const cards = [
        { selector: '.stats-grid .stat-card:nth-child(1) .stat-value', value: stats.activeOrders },
        { selector: '.stats-grid .stat-card:nth-child(2) .stat-value', value: stats.missingMaterials },
        { selector: '.stats-grid .stat-card:nth-child(3) .stat-value', value: stats.delayedOrders },
        { selector: '.stats-grid .stat-card:nth-child(4) .stat-value', value: stats.thisMonthDelivery }
    ];
    
    cards.forEach(card => {
        const element = document.querySelector(card.selector);
        if (element) {
            element.textContent = card.value;
            
            // Değişimi vurgulamak için basit bir animasyon
            element.style.transition = 'transform 0.3s ease';
            element.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }
    });
}

/**
 * Dashboard grafikleri çiz
 */
function drawDashboardCharts() {
    // Önce eski grafikleri temizle
    if (dashboardState.charts.orderChart) {
        dashboardState.charts.orderChart.destroy();
    }
    
    if (dashboardState.charts.customerChart) {
        dashboardState.charts.customerChart.destroy();
    }
    
    // Sipariş teslim grafiği için veriler
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const orderData = [8, 13, 17, 19, 15, 12, 10, 14, 16, 20, 14, 11];
    const deliveryData = [7, 12, 16, 17, 14, 11, 9, 13, 15, 18, 13, 10];
    
    // Sipariş-teslim grafiği
    const orderChartCanvas = document.getElementById('orderChart');
    if (orderChartCanvas) {
        dashboardState.charts.orderChart = new Chart(orderChartCanvas, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Siparişler',
                        data: orderData,
                        borderColor: '#1e40af',
                        backgroundColor: 'rgba(30, 64, 175, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Teslimler',
                        data: deliveryData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Aylık Sipariş ve Teslimat',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sipariş Sayısı'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    // Müşteri dağılımı grafiği
    const customerChartCanvas = document.getElementById('customerChart');
    if (customerChartCanvas) {
        dashboardState.charts.customerChart = new Chart(customerChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['AYEDAŞ', 'ENERJİSA', 'BAŞKENT EDAŞ', 'TOROSLAR EDAŞ', 'Diğer'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#1e40af',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#6b7280'
                    ],
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            boxWidth: 12,
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Müşterilere Göre Siparişler',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${percentage}% (${value})`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }
}

/**
 * Aktif siparişleri yükle
 * @returns {Promise<Array>} Siparişler
 */
async function loadActiveOrders() {
    try {
        if (!dashboardElements.ordersTable) {
            dashboardElements.ordersTable = document.querySelector('#orders-table tbody');
        }
        
        if (!dashboardElements.ordersTable) {
            console.warn('Sipariş tablosu elementi bulunamadı');
            return [];
        }
        
        // Yükleniyor göster
        dashboardElements.ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">Yükleniyor...</td></tr>';
        
        if (firebase && firebase.firestore) {
            const ordersSnapshot = await firebase.firestore().collection('orders')
                .where('status', '!=', 'completed')
                .orderBy('deliveryDate', 'asc')
                .limit(10)
                .get();
            
            if (ordersSnapshot.empty) {
                dashboardElements.ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">Aktif sipariş bulunamadı</td></tr>';
                return [];
            }
            
            // Siparişleri topla
            const orders = [];
            ordersSnapshot.forEach(doc => {
                orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const ordersHTML = generateOrdersTableHTML(orders);
            dashboardElements.ordersTable.innerHTML = ordersHTML;
            
            return orders;
        } else {
            // Demo verileri
            const demoOrders = getDemoOrders();
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const ordersHTML = generateOrdersTableHTML(demoOrders);
            dashboardElements.ordersTable.innerHTML = ordersHTML;
            
            return demoOrders;
        }
    } catch (error) {
        console.error("Aktif siparişler yüklenirken hata:", error);
        
        if (dashboardElements.ordersTable) {
            dashboardElements.ordersTable.innerHTML = `<tr><td colspan="7" class="text-center">Hata: ${error.message}</td></tr>`;
        }
        
        // Demo verileri döndür
        return getDemoOrders();
    }
}

/**
 * Aktif siparişler tablosu HTML'ini oluştur
 * @param {Array} orders - Sipariş listesi
 * @returns {string} Tablo HTML'i
 */
function generateOrdersTableHTML(orders) {
    if (!orders || orders.length === 0) {
        return '<tr><td colspan="7" class="text-center">Gösterilecek sipariş bulunamadı</td></tr>';
    }
    
    let html = '';
    
    orders.forEach(order => {
        const orderDate = formatDate(order.orderDate);
        const deliveryDate = formatDate(order.deliveryDate);
        
        // Durum sınıfı ve metni belirle
        let statusClass = getStatusClass(order.status);
        let statusText = getStatusText(order.status);
        
        // Satır sınıfı (kritik, uyarı vb.)
        let rowClass = '';
        if (order.hasMaterialIssue) rowClass = 'danger';
        else if (order.hasWarning) rowClass = 'warning';
        
        html += `
            <tr onclick="showOrderDetail('${order.id}')" class="${rowClass}" style="cursor: pointer;">
                <td>${order.orderNo || ''}</td>
                <td>${order.customer || ''}</td>
                <td>${order.missingMaterials || 0}</td>
                <td>${deliveryDate}</td>
                <td>${orderDate}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); showOrderDetail('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editOrder('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    return html;
}

/**
 * Eksik malzemeleri yükle
 * @returns {Promise<Array>} Eksik malzemeler
 */
async function loadMissingMaterials() {
    try {
        if (!dashboardElements.missingMaterialsTable) {
            dashboardElements.missingMaterialsTable = document.querySelector('#missing-materials-table tbody');
        }
        
        if (!dashboardElements.missingMaterialsTable) {
            console.warn('Eksik malzemeler tablosu elementi bulunamadı');
            return [];
        }
        
        // Yükleniyor göster
        dashboardElements.missingMaterialsTable.innerHTML = '<tr><td colspan="5" class="text-center">Yükleniyor...</td></tr>';
        
        if (firebase && firebase.firestore) {
            const materialsSnapshot = await firebase.firestore().collection('materials')
                .where('inStock', '==', false)
                .limit(5)
                .get();
            
            if (materialsSnapshot.empty) {
                dashboardElements.missingMaterialsTable.innerHTML = '<tr><td colspan="5" class="text-center">Eksik malzeme bulunamadı</td></tr>';
                return [];
            }
            
            // Malzemeleri topla
            const materials = [];
            materialsSnapshot.forEach(doc => {
                materials.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const materialsHTML = generateMissingMaterialsHTML(materials);
            dashboardElements.missingMaterialsTable.innerHTML = materialsHTML;
            
            return materials;
        } else {
            // Demo verileri
            const demoMissingMaterials = getDemoMissingMaterials();
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const materialsHTML = generateMissingMaterialsHTML(demoMissingMaterials);
            dashboardElements.missingMaterialsTable.innerHTML = materialsHTML;
            
            return demoMissingMaterials;
        }
    } catch (error) {
        console.error("Eksik malzemeler yüklenirken hata:", error);
        
        if (dashboardElements.missingMaterialsTable) {
            dashboardElements.missingMaterialsTable.innerHTML = `<tr><td colspan="5" class="text-center">Hata: ${error.message}</td></tr>`;
        }
        
        // Demo verileri döndür
        return getDemoMissingMaterials();
    }
}

/**
 * Eksik malzemeler tablosu HTML'ini oluştur
 * @param {Array} materials - Malzeme listesi
 * @returns {string} Tablo HTML'i
 */
function generateMissingMaterialsHTML(materials) {
    if (!materials || materials.length === 0) {
        return '<tr><td colspan="5" class="text-center">Eksik malzeme bulunamadı</td></tr>';
    }
    
    let html = '';
    
    materials.forEach(material => {
        // Tedarik tarihi formatla
        const supplyDate = formatDate(material.expectedSupplyDate);
        
        // Öncelik sınıfı ve metni belirle
        let priorityClass = 'badge-info';
        let priorityText = 'Normal';
        
        if (material.expectedSupplyDate) {
            const today = new Date();
            const supplyDateObj = new Date(material.expectedSupplyDate.toDate ? material.expectedSupplyDate.toDate() : material.expectedSupplyDate);
            const orderNeedDate = material.orderNeedDate ? new Date(material.orderNeedDate.toDate ? material.orderNeedDate.toDate() : material.orderNeedDate) : null;
            
            if (orderNeedDate && supplyDateObj > orderNeedDate) {
                priorityClass = 'badge-danger';
                priorityText = 'Kritik';
            } else if (supplyDateObj < today) {
                priorityClass = 'badge-warning';
                priorityText = 'Uyarı';
            }
        }
        
        html += `
            <tr>
                <td>${material.orderNo || ''}</td>
                <td>${material.name || ''}</td>
                <td><span class="badge badge-warning">Siparişte</span></td>
                <td>${supplyDate}</td>
                <td><span class="badge ${priorityClass}">${priorityText}</span></td>
            </tr>
        `;
    });
    
    return html;
}

/**
 * Yaklaşan teslimleri yükle
 * @returns {Promise<Array>} Yaklaşan teslimler
 */
async function loadUpcomingDeliveries() {
    try {
        if (!dashboardElements.upcomingDeliveriesTable) {
            dashboardElements.upcomingDeliveriesTable = document.querySelector('#upcoming-deliveries-table tbody');
        }
        
        if (!dashboardElements.upcomingDeliveriesTable) {
            console.warn('Yaklaşan teslimler tablosu elementi bulunamadı');
            return [];
        }
        
        // Yükleniyor göster
        dashboardElements.upcomingDeliveriesTable.innerHTML = '<tr><td colspan="5" class="text-center">Yükleniyor...</td></tr>';
        
        if (firebase && firebase.firestore) {
            const today = new Date();
            const thirtyDaysLater = new Date(today);
            thirtyDaysLater.setDate(today.getDate() + 30);
            
            const deliveriesSnapshot = await firebase.firestore().collection('orders')
                .where('deliveryDate', '>', today)
                .where('deliveryDate', '<=', thirtyDaysLater)
                .where('status', '!=', 'completed')
                .orderBy('deliveryDate', 'asc')
                .limit(5)
                .get();
            
            if (deliveriesSnapshot.empty) {
                dashboardElements.upcomingDeliveriesTable.innerHTML = '<tr><td colspan="5" class="text-center">Yaklaşan teslimat bulunamadı</td></tr>';
                return [];
            }
            
            // Teslimatları topla
            const deliveries = [];
            deliveriesSnapshot.forEach(doc => {
                deliveries.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const deliveriesHTML = generateUpcomingDeliveriesHTML(deliveries);
            dashboardElements.upcomingDeliveriesTable.innerHTML = deliveriesHTML;
            
            return deliveries;
        } else {
            // Demo verileri
            const demoDeliveries = getDemoUpcomingDeliveries();
            
            // Tablo HTML'ini oluştur ve tabloyu güncelle
            const deliveriesHTML = generateUpcomingDeliveriesHTML(demoDeliveries);
            dashboardElements.upcomingDeliveriesTable.innerHTML = deliveriesHTML;
            
            return demoDeliveries;
        }
    } catch (error) {
        console.error("Yaklaşan teslimler yüklenirken hata:", error);
        
        if (dashboardElements.upcomingDeliveriesTable) {
            dashboardElements.upcomingDeliveriesTable.innerHTML = `<tr><td colspan="5" class="text-center">Hata: ${error.message}</td></tr>`;
        }
        
        // Demo verileri döndür
        return getDemoUpcomingDeliveries();
    }
}

/**
 * Yaklaşan teslimler tablosu HTML'ini oluştur
 * @param {Array} deliveries - Teslimat listesi
 * @returns {string} Tablo HTML'i
 */
function generateUpcomingDeliveriesHTML(deliveries) {
    if (!deliveries || deliveries.length === 0) {
        return '<tr><td colspan="5" class="text-center">Yaklaşan teslimat bulunamadı</td></tr>';
    }
    
    let html = '';
    const today = new Date();
    
    deliveries.forEach(delivery => {
        // Teslimat tarihi formatla
        const deliveryDate = formatDate(delivery.deliveryDate);
        
        // Kalan gün hesapla
        const deliveryDateObj = new Date(delivery.deliveryDate.toDate ? delivery.deliveryDate.toDate() : delivery.deliveryDate);
        const remainingDays = Math.ceil((deliveryDateObj - today) / (1000 * 60 * 60 * 24));
        
        // Durum sınıfı ve metni belirle
        let statusClass = getStatusClass(delivery.status);
        let statusText = getStatusText(delivery.status);
        
        // Kalan gün sınıfı (acil, uyarı vb.)
        let daysClass = '';
        if (remainingDays <= 3) daysClass = 'text-danger';
        else if (remainingDays <= 7) daysClass = 'text-warning';
        
        html += `
            <tr onclick="showOrderDetail('${delivery.id}')" style="cursor: pointer;">
                <td>${delivery.orderNo || ''}</td>
                <td>${delivery.customer || ''}</td>
                <td>${deliveryDate}</td>
                <td class="${daysClass}">${remainingDays} gün</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    
    return html;
}

/**
 * Durum metnini al
 * @param {string} status - Durum kodu
 * @returns {string} Durum metni
 */
function getStatusText(status) {
    switch (status) {
        case 'waiting': return 'Malzeme Bekleniyor';
        case 'production': return 'Üretimde';
        case 'ready': return 'Malzeme Hazır';
        case 'planning': return 'Planlama';
        case 'testing': return 'Test';
        case 'completed': return 'Tamamlandı';
        default: return 'Bilinmiyor';
    }
}

/**
 * Durum sınıfını al
 * @param {string} status - Durum kodu
 * @returns {string} CSS sınıfı
 */
function getStatusClass(status) {
    switch (status) {
        case 'waiting': return 'badge-warning';
        case 'production': return 'badge-info';
        case 'ready': return 'badge-success';
        case 'planning': return 'badge-secondary';
        case 'testing': return 'badge-primary';
        case 'completed': return 'badge-dark';
        default: return 'badge-info';
    }
}

/**
 * Siparişleri filtrele
 */
function filterOrders() {
    // Filtre değerlerini al
    const searchText = document.querySelector('.search-input')?.value.toLowerCase() || '';
    const statusFilter = document.querySelector('.filter-item select:nth-child(1)')?.value || '';
    const customerFilter = document.querySelector('.filter-item select:nth-child(2)')?.value || '';
    
    // Filtreleme durumunu kaydet
    dashboardState.activeFilters = {
        searchText,
        status: statusFilter,
        customer: customerFilter
    };
    
    // Tüm satırları kontrol et
    const rows = document.querySelectorAll('#orders-table tbody tr');
    
    rows.forEach(row => {
        let showRow = true;
        
        // Metin araması
        if (searchText) {
            let found = false;
            row.querySelectorAll('td').forEach(cell => {
                if (cell.textContent.toLowerCase().includes(searchText)) {
                    found = true;
                }
            });
            if (!found) showRow = false;
        }
        
        // Status filtresi
        if (statusFilter && showRow) {
            const statusCell = row.querySelector('td:nth-child(6)');
            if (statusCell) {
                const status = statusCell.textContent.toLowerCase();
                if (!status.includes(statusFilter.toLowerCase())) {
                    showRow = false;
                }
            }
        }
        
        // Müşteri filtresi
        if (customerFilter && showRow) {
            const customerCell = row.querySelector('td:nth-child(2)');
            if (customerCell) {
                const customer = customerCell.textContent;
                if (customer !== customerFilter) {
                    showRow = false;
                }
            }
        }
        
        // Satırı göster/gizle
        row.style.display = showRow ? '' : 'none';
    });
    
    // Filtreleme sonucunu özetle
    const visibleRows = [...rows].filter(row => row.style.display !== 'none').length;
    const totalRows = rows.length;
    
    console.log(`Filtreleme sonucu: ${visibleRows}/${totalRows} sipariş gösteriliyor`);
}

/**
 * Demo sipariş verilerini al
 * @returns {Array} Demo siparişler
 */
function getDemoOrders() {
    return [
        {
            id: 'order-1',
            orderNo: '24-03-A001',
            customer: 'AYEDAŞ',
            missingMaterials: 0,
            deliveryDate: '20.05.2024',
            orderDate: '15.02.2024',
            status: 'production',
            hasWarning: true
        },
        {
            id: 'order-2',
            orderNo: '24-03-B002',
            customer: 'BAŞKENT EDAŞ',
            missingMaterials: 2,
            deliveryDate: '15.05.2024',
            orderDate: '20.02.2024',
            status: 'waiting',
            hasMaterialIssue: true
        },
        {
            id: 'order-3',
            orderNo: '24-03-C003',
            customer: 'ENERJİSA',
            missingMaterials: 0,
            deliveryDate: '10.06.2024',
            orderDate: '25.02.2024',
            status: 'ready'
        },
        {
            id: 'order-4',
            orderNo: '24-04-D004',
            customer: 'TOROSLAR EDAŞ',
            missingMaterials: 0,
            deliveryDate: '25.06.2024',
            orderDate: '01.03.2024',
            status: 'planning'
        },
        {
            id: 'order-5',
            orderNo: '24-04-E005',
            customer: 'AYEDAŞ',
            missingMaterials: 0,
            deliveryDate: '10.07.2024',
            orderDate: '05.03.2024',
            status: 'planning'
        }
    ];
}

/**
 * Demo eksik malzeme verilerini al
 * @returns {Array} Demo eksik malzemeler
 */
function getDemoMissingMaterials() {
    return [
        {
            orderNo: '24-03-B002',
            name: 'Kablo Başlıkları',
            status: 'Siparişte',
            expectedSupplyDate: '01.05.2024',
            orderNeedDate: '20.04.2024',
            priority: 'Kritik'
        },
        {
            orderNo: '24-03-B002',
            name: 'Gerilim Gösterge',
            status: 'Siparişte',
            expectedSupplyDate: '28.04.2024',
            orderNeedDate: '30.04.2024',
            priority: 'Uyarı'
        },
        {
            orderNo: '24-05-F007',
            name: 'Kesici',
            status: 'Siparişte',
            expectedSupplyDate: '15.05.2024',
            orderNeedDate: '20.05.2024',
            priority: 'Normal'
        }
    ];
}

/**
 * Demo yaklaşan teslimatlar verilerini al
 * @returns {Array} Demo yaklaşan teslimatlar
 */
function getDemoUpcomingDeliveries() {
    return [
        {
            id: 'order-2',
            orderNo: '24-03-B002',
            customer: 'BAŞKENT EDAŞ',
            deliveryDate: '15.05.2024',
            remainingDays: 7,
            status: 'waiting'
        },
        {
            id: 'order-1',
            orderNo: '24-03-A001',
            customer: 'AYEDAŞ',
            deliveryDate: '20.05.2024',
            remainingDays: 12,
            status: 'production'
        },
        {
            id: 'order-3',
            orderNo: '24-03-C003',
            customer: 'ENERJİSA',
            deliveryDate: '10.06.2024',
            remainingDays: 33,
            status: 'ready'
        }
    ];
}

/**
 * Sipariş detayını göster
 * @param {string} orderId - Sipariş ID'si
 */
function showOrderDetail(orderId) {
    if (typeof window.showOrderDetail === 'function') {
        window.showOrderDetail(orderId);
    } else {
        const modal = document.getElementById('order-detail-modal');
        const idSpan = document.getElementById('order-detail-id');
        if (modal && idSpan) {
            idSpan.textContent = orderId;
            
            // Demo sipariş detayları
            const demoOrders = getDemoOrders();
            const order = demoOrders.find(o => o.id === orderId) || demoOrders[0];
            
            // Modalı göster
            showModal('order-detail-modal');
            
            // Form alanlarını doldur
            setTimeout(() => {
                document.querySelector('#order-general input[name="orderNo"]').value = order.orderNo;
                document.querySelector('#order-general input[name="customer"]').value = order.customer;
                document.querySelector('#order-general input[name="cellType"]').value = "RM 36 LB";
                document.querySelector('#order-general input[name="cellCount"]').value = "3";
                document.querySelector('#order-general input[name="orderDate"]').value = order.orderDate;
                document.querySelector('#order-general input[name="deliveryDate"]').value = order.deliveryDate;
                document.querySelector('#order-general select[name="status"]').value = order.status;
                
                // İş akışı durumunu güncelle
                updateWorkflowStatus(order.status);
            }, 300);
        }
    }
}

/**
 * İş akışı durumunu güncelle
 * @param {string} status - Sipariş durumu
 */
function updateWorkflowStatus(status) {
    const steps = document.querySelectorAll('.workflow-step');
    if (!steps || steps.length === 0) return;
    
    // Tüm adımları sıfırla
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Durum göre adımları işaretle
    switch (status) {
        case 'planning':
            steps[0].classList.add('active');
            break;
        case 'waiting':
            steps[0].classList.add('completed');
            steps[1].classList.add('active');
            break;
        case 'production':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('active');
            break;
        case 'testing':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('completed');
            steps[3].classList.add('active');
            break;
        case 'ready':
        case 'completed':
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('completed');
            steps[3].classList.add('completed');
            steps[4].classList.add('active');
            break;
        default:
            steps[0].classList.add('active');
    }
}

/**
 * Sipariş detay formdaki verilerini kaydet
 * @param {string} orderId - Sipariş ID'si
 */
async function saveOrderDetails(orderId) {
    try {
        // Form değerleri topla
        const orderData = {
            customer: document.querySelector('#order-general input[name="customer"]').value,
            cellType: document.querySelector('#order-general input[name="cellType"]').value,
            cellCount: parseInt(document.querySelector('#order-general input[name="cellCount"]').value) || 0,
            status: document.querySelector('#order-general select[name="status"]').value
        };
        
        // Tarihleri düzenle
        const orderDateStr = document.querySelector('#order-general input[name="orderDate"]').value;
        const deliveryDateStr = document.querySelector('#order-general input[name="deliveryDate"]').value;
        
        if (orderDateStr) {
            // TR formatı (DD.MM.YYYY) ise Date nesnesine çevir
            const dateParts = orderDateStr.split('.');
            if (dateParts.length === 3) {
                orderData.orderDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            }
        }
        
        if (deliveryDateStr) {
            // TR formatı (DD.MM.YYYY) ise Date nesnesine çevir
            const dateParts = deliveryDateStr.split('.');
            if (dateParts.length === 3) {
                orderData.deliveryDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            }
        }
        
        // Firebase ile güncelleme yap
        if (firebase && firebase.firestore) {
            await firebase.firestore().collection('orders').doc(orderId).update(orderData);
            showToast("Sipariş bilgileri güncellendi", "success");
        } else {
            // Demo modda güncelleme simülasyonu
            showToast("Sipariş bilgileri güncellendi (Demo)", "success");
        }
        
        // Modal kapat
        closeModal('order-detail-modal');
        
        // Dashboard verilerini yenile
        refreshData();
        
        return true;
    } catch (error) {
        console.error("Sipariş güncelleme hatası:", error);
        showToast("Sipariş güncellenirken bir hata oluştu: " + error.message, "error");
        return false;
    }
}

/**
 * Dashboard verilerini yükleme işlevini dışa aktar
 */
window.loadDashboardData = loadDashboardData;

/**
 * Sayfa yüklendiğinde çalışacak
 */
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard aktifse verileri yükle
    if (document.getElementById('dashboard-page')?.classList.contains('active')) {
        loadDashboardData();
    }
    
    // Sayfa değişikliği olay dinleyicisi
    document.addEventListener('pageChanged', function(e) {
        if (e.detail && e.detail.page === 'dashboard') {
            loadDashboardData();
        }
    });
    
    // Sipariş detay modalı kaydedildiğinde
    const orderDetailSaveBtn = document.querySelector('#order-detail-modal .modal-footer .btn-primary');
    if (orderDetailSaveBtn) {
        orderDetailSaveBtn.addEventListener('click', function() {
            const orderId = document.getElementById('order-detail-id').textContent;
            saveOrderDetails(orderId);
        });
    }
    
    // Filtre değişikliklerini dinle
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterOrders);
    }
    
    // Filtre select elementleri
    const filterSelects = document.querySelectorAll('.filter-item select');
    filterSelects.forEach(select => {
        select.addEventListener('change', filterOrders);
    });
    
    // Yenileme butonu
    const refreshBtn = document.querySelector('.page-header .btn-outline');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
        });
    }
});