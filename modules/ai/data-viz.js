/**
 * data-viz.js
 * İleri veri görselleştirme işlevleri - Dashboard için
 */

// Üretim verimliliği grafiğini oluştur
function createProductionEfficiencyChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Canvas elementi oluştur
    const canvas = document.createElement('canvas');
    canvas.id = 'production-efficiency-chart';
    container.appendChild(canvas);
    
    // Chart verilerini hazırla - verimlilik yüzdesi
    const labels = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'];
    const targetData = [100, 100, 100, 100, 100, 100]; // Hedef çizgisi
    const actualData = [93, 89, 94, 97, 92, 95]; // Gerçekleşen verimlilik
    
    // Chart.js grafiği oluştur
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hedef Verimlilik (%)',
                    data: targetData,
                    borderColor: 'rgba(255, 99, 132, 0.7)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Gerçekleşen Verimlilik (%)',
                    data: actualData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Üretim Verimliliği',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 60,
                    max: 110,
                    title: {
                        display: true,
                        text: 'Verimlilik (%)'
                    }
                }
            }
        }
    });
}

// Malzeme tüketim grafiğini oluştur (materyal kullanım verimliliği)
function createMaterialConsumptionChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Canvas elementi oluştur
    const canvas = document.createElement('canvas');
    canvas.id = 'material-consumption-chart';
    container.appendChild(canvas);
    
    // Chart verilerini hazırla
    const data = {
        labels: ['Kablo', 'Metal Parçalar', 'Elektronik Komponentler', 'İzolatörler', 'Kesiciler'],
        datasets: [{
            data: [92, 88, 95, 97, 90],
            backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)'
            ],
            borderWidth: 1,
            borderColor: '#ffffff'
        }]
    };
    
    // Chart.js grafiği oluştur
    new Chart(canvas, {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 60,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 10
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Malzeme Kullanım Verimliliği (%)',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw + '%';
                        }
                    }
                }
            }
        }
    });
}

// Üretim zaman çizelgesi (Gantt benzeri)
function createProductionTimeline(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // HTML içeriği oluştur
    container.innerHTML = `
        <div class="production-timeline">
            <h3 class="chart-title">Aktif Sipariş Üretim Zaman Çizelgesi</h3>
            <div class="timeline-container">
                <div class="timeline-header">
                    <div class="timeline-project">Sipariş / Müşteri</div>
                    <div class="timeline-dates">
                        <span>1 May</span>
                        <span>5 May</span>
                        <span>10 May</span>
                        <span>15 May</span>
                        <span>20 May</span>
                        <span>25 May</span>
                        <span>30 May</span>
                    </div>
                </div>
                <div class="timeline-body">
                    <div class="timeline-row">
                        <div class="timeline-project">AYEDAŞ - RM 36 LB</div>
                        <div class="timeline-bar-container">
                            <div class="timeline-bar" style="left: 0%; width: 30%; background-color: #4CAF50;">
                                <span class="timeline-tooltip">Üretimde: 1-10 Mayıs</span>
                            </div>
                        </div>
                    </div>
                    <div class="timeline-row">
                        <div class="timeline-project">BAŞKENT EDAŞ - RM 36 FL</div>
                        <div class="timeline-bar-container">
                            <div class="timeline-bar" style="left: 20%; width: 35%; background-color: #FF9800;">
                                <span class="timeline-tooltip">Üretimde: 7-18 Mayıs</span>
                            </div>
                        </div>
                    </div>
                    <div class="timeline-row">
                        <div class="timeline-project">ENERJİSA - RM 36 CB</div>
                        <div class="timeline-bar-container">
                            <div class="timeline-bar" style="left: 50%; width: 40%; background-color: #2196F3;">
                                <span class="timeline-tooltip">Üretimde: 16-28 Mayıs</span>
                            </div>
                        </div>
                    </div>
                    <div class="timeline-row">
                        <div class="timeline-project">TOROSLAR EDAŞ - RM 36 LB</div>
                        <div class="timeline-bar-container">
                            <div class="timeline-bar future" style="left: 75%; width: 25%; background-color: #9C27B0;">
                                <span class="timeline-tooltip">Planlanan: 23 Mayıs-3 Haziran</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Zaman çizelgesi için CSS ekle
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .production-timeline {
            margin: 20px 0;
            font-family: Arial, sans-serif;
        }
        .chart-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            text-align: center;
        }
        .timeline-container {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .timeline-header {
            display: flex;
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 0;
        }
        .timeline-project {
            width: 180px;
            padding: 0 10px;
            font-weight: 500;
            flex-shrink: 0;
        }
        .timeline-dates {
            flex: 1;
            display: flex;
            justify-content: space-between;
            padding: 0 10px;
        }
        .timeline-dates span {
            font-size: 12px;
            color: #64748b;
        }
        .timeline-body {
            max-height: 300px;
            overflow-y: auto;
        }
        .timeline-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .timeline-row:last-child {
            border-bottom: none;
        }
        .timeline-bar-container {
            flex: 1;
            position: relative;
            height: 30px;
            padding: 0 10px;
        }
        .timeline-bar {
            position: absolute;
            height: 100%;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
        }
        .timeline-bar.future {
            background-image: repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.1),
                rgba(255,255,255,0.1) 10px,
                rgba(255,255,255,0.2) 10px,
                rgba(255,255,255,0.2) 20px
            );
        }
        .timeline-tooltip {
            position: absolute;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
        }
        .timeline-bar:hover .timeline-tooltip {
            opacity: 1;
        }
    `;
    document.head.appendChild(styleElement);
}

// Gecikme risk haritası
function createDelayRiskMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Canvas elementi oluştur
    const canvas = document.createElement('canvas');
    canvas.id = 'delay-risk-map';
    container.appendChild(canvas);
    
    // Sipariş verileri
    const orders = [
        { id: '24-03-A001', name: 'AYEDAŞ', complexity: 60, materialsReadiness: 90, riskScore: 25 },
        { id: '24-03-B002', name: 'BAŞKENT EDAŞ', complexity: 85, materialsReadiness: 65, riskScore: 80 },
        { id: '24-03-C003', name: 'ENERJİSA', complexity: 70, materialsReadiness: 85, riskScore: 40 },
        { id: '24-04-D004', name: 'TOROSLAR EDAŞ', complexity: 90, materialsReadiness: 75, riskScore: 70 },
        { id: '24-04-E005', name: 'AYEDAŞ', complexity: 50, materialsReadiness: 95, riskScore: 15 },
        { id: '24-04-F006', name: 'ENERJİSA', complexity: 75, materialsReadiness: 60, riskScore: 65 }
    ];
    
    // Bubble chart için veri hazırla
    const bubbleData = {
        datasets: [{
            label: 'Gecikme Riski',
            data: orders.map(order => ({
                x: order.complexity,
                y: order.materialsReadiness,
                r: order.riskScore / 4, // Risk skorunu kabarcık boyutuna dönüştür
                id: order.id,
                name: order.name,
                riskScore: order.riskScore
            })),
            backgroundColor: orders.map(order => {
                // Risk skoruna göre renk belirle (yeşil-sarı-kırmızı)
                if (order.riskScore < 30) return 'rgba(46, 204, 113, 0.7)'; // Düşük risk
                else if (order.riskScore < 70) return 'rgba(241, 196, 15, 0.7)'; // Orta risk
                else return 'rgba(231, 76, 60, 0.7)'; // Yüksek risk
            }),
            borderColor: orders.map(order => {
                if (order.riskScore < 30) return 'rgba(46, 204, 113, 1)';
                else if (order.riskScore < 70) return 'rgba(241, 196, 15, 1)';
                else return 'rgba(231, 76, 60, 1)';
            }),
            borderWidth: 1
        }]
    };
    
    // Chart.js grafiği oluştur
    new Chart(canvas, {
        type: 'bubble',
        data: bubbleData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    min: 40,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Üretim Karmaşıklığı'
                    }
                },
                y: {
                    min: 50,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Malzeme Hazırlık Durumu (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sipariş Gecikme Risk Haritası',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `Sipariş: ${data.id} (${data.name})`,
                                `Üretim Karmaşıklığı: ${data.x}%`,
                                `Malzeme Hazırlık: ${data.y}%`,
                                `Risk Skoru: ${data.riskScore}/100`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Maliyet ve Verimlilik Analizi
function createCostEfficiencyChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Canvas elementi oluştur
    const canvas = document.createElement('canvas');
    canvas.id = 'cost-efficiency-chart';
    container.appendChild(canvas);
    
    // Chart verileri
    const barData = {
        labels: ['Maliyet', 'Malzeme', 'İşçilik', 'Nakliye', 'Diğer'],
        datasets: [
            {
                label: 'Planlanan (₺)',
                data: [350000, 150000, 110000, 40000, 50000],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                label: 'Gerçekleşen (₺)',
                data: [330000, 160000, 100000, 35000, 35000],
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    };
    
    // Chart.js grafiği oluştur
    new Chart(canvas, {
        type: 'bar',
        data: barData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tutar (₺)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Maliyet Analizi',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Veri görselleştirme Dashboard'a ekle
function addVisualizationsToDashboard() {
    // İki sütunlu container oluştur
    const dashboardPage = document.getElementById('dashboard-page');
    if (!dashboardPage) return;
    
    // Görselleştirmeler için div ekle
    const visualizationsContainer = document.createElement('div');
    visualizationsContainer.className = 'visualizations-container';
    visualizationsContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">İleri Analizler</div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col">
                        <div id="production-efficiency-container" style="height: 300px;"></div>
                    </div>
                    <div class="col">
                        <div id="material-consumption-container" style="height: 300px;"></div>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col">
                        <div id="delay-risk-container" style="height: 300px;"></div>
                    </div>
                    <div class="col">
                        <div id="cost-efficiency-container" style="height: 300px;"></div>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col">
                        <div id="production-timeline-container"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Container'ı sayfaya ekle - AI önerilerinden sonra
    const aiRecommendationsCard = dashboardPage.querySelector('.card:last-child');
    if (aiRecommendationsCard) {
        dashboardPage.insertBefore(visualizationsContainer, null);
    } else {
        dashboardPage.appendChild(visualizationsContainer);
    }
    
    // Grafikleri oluştur
    setTimeout(() => {
        createProductionEfficiencyChart('production-efficiency-container');
        createMaterialConsumptionChart('material-consumption-container');
        createDelayRiskMap('delay-risk-container');
        createCostEfficiencyChart('cost-efficiency-container');
        createProductionTimeline('production-timeline-container');
    }, 500);
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard sayfası açıksa görselleştirmeleri ekle
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage && dashboardPage.classList.contains('active')) {
        setTimeout(addVisualizationsToDashboard, 1000);
    }
    
    // Sayfa değişikliğini dinle
    document.addEventListener('pageChanged', function(e) {
        if (e.detail && e.detail.page === 'dashboard') {
            setTimeout(addVisualizationsToDashboard, 1000);
        }
    });
});

// Sayfa değişikliği için özel olay oluştur
function dispatchPageChangeEvent(page) {
    const event = new CustomEvent('pageChanged', {
        detail: {
            page: page
        }
    });
    document.dispatchEvent(event);
}

// Orijinal showPage fonksiyonunu geçersiz kıl
const originalShowPage = window.showPage;
window.showPage = function(pageName) {
    // Orijinal fonksiyonu çağır
    if (typeof originalShowPage === 'function') {
        originalShowPage(pageName);
    }
    
    // Özel olayı tetikle
    dispatchPageChangeEvent(pageName);
};