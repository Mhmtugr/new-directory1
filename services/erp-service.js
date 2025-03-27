/**
 * erp-service.js
 * Canias ERP sistemi ile entegrasyon
 */

import AppConfig from '../config/app-config.js';
import EventBus from '../utils/event-bus.js';

// ERP Servis Sınıfı
class ERPService {
    // Stok bilgilerini al
    static async getStockData() {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.getDemoStockData();
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/stock`);
            
            if (!response.ok) {
                throw new Error(`ERP stok verisi alınamadı: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("ERP stok verisi alınırken hata:", error);
            return await this.getDemoStockData();
        }
    }
    
    // Sipariş bilgilerini al
    static async getOrderData() {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.getDemoOrderData();
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/orders`);
            
            if (!response.ok) {
                throw new Error(`ERP sipariş verisi alınamadı: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("ERP sipariş verisi alınırken hata:", error);
            return await this.getDemoOrderData();
        }
    }
    
    // Müşteri bilgilerini al
    static async getCustomerData() {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.getDemoCustomerData();
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/customers`);
            
            if (!response.ok) {
                throw new Error(`ERP müşteri verisi alınamadı: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("ERP müşteri verisi alınırken hata:", error);
            return await this.getDemoCustomerData();
        }
    }
    
    // Malzeme listesini al
    static async getMaterialListData(orderType) {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.getDemoMaterialListData(orderType);
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/material-lists?type=${orderType}`);
            
            if (!response.ok) {
                throw new Error(`ERP malzeme listesi alınamadı: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("ERP malzeme listesi alınırken hata:", error);
            return await this.getDemoMaterialListData(orderType);
        }
    }
    
    // Stok rezervasyonu
    static async reserveStock(materials, orderId) {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.simulateStockReservation(materials, orderId);
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/reserve-stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    materials,
                    orderId
                })
            });
            
            if (!response.ok) {
                throw new Error(`ERP stok rezervasyonu yapılamadı: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Stok değişikliği olayını yayınla
            EventBus.emit('stockUpdated', {
                orderId,
                materials: result.reservedMaterials
            });
            
            return result;
        } catch (error) {
            console.error("ERP stok rezervasyonu yapılırken hata:", error);
            return await this.simulateStockReservation(materials, orderId);
        }
    }
    
    // Sipariş oluştur
    static async createOrder(orderData) {
        try {
            if (!AppConfig.erpIntegration.enabled) {
                return await this.simulateOrderCreation(orderData);
            }
            
            const response = await fetch(`${AppConfig.erpIntegration.apiEndpoint}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            if (!response.ok) {
                throw new Error(`ERP sipariş oluşturulamadı: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Yeni sipariş olayını yayınla
            EventBus.emit('newOrderCreated', result);
            
            return result;
        } catch (error) {
            console.error("ERP sipariş oluşturulurken hata:", error);
            return await this.simulateOrderCreation(orderData);
        }
    }
    
    // DEMO: Stok verisi
    static async getDemoStockData() {
        // Demo stok verisi
        return [
            { code: "137998%", name: "Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC", quantity: 2, unit: "ADET", warehouse: "B01", minStock: 5, onOrder: 6, expectedDate: "2024-12-05" },
            { code: "144866%", name: "KAP-80/190-95 Akım Trafosu", quantity: 3, unit: "ADET", warehouse: "B01", minStock: 5, onOrder: 5, expectedDate: "2024-12-10" },
            { code: "120170%", name: "M480TB/G-027-95.300UN5 Kablo Başlığı", quantity: 12, unit: "ADET", warehouse: "B01", minStock: 10, onOrder: 0, expectedDate: null },
            { code: "109367%", name: "582mm Bara", quantity: 25, unit: "ADET", warehouse: "B01", minStock: 15, onOrder: 0, expectedDate: null },
            { code: "133278%", name: "36kV 630A Vakum Kesici", quantity: 5, unit: "ADET", warehouse: "B01", minStock: 3, onOrder: 2, expectedDate: "2024-12-15" },
            { code: "125444%", name: "36kV 630A Yük Ayırıcısı", quantity: 4, unit: "ADET", warehouse: "B01", minStock: 3, onOrder: 0, expectedDate: null },
            { code: "161220%", name: "36kV 200A Sigorta Taşıyıcısı", quantity: 7, unit: "ADET", warehouse: "B01", minStock: 5, onOrder: 0, expectedDate: null },
            { code: "118332%", name: "24kV 63A HRC Sigorta", quantity: 15, unit: "ADET", warehouse: "B01", minStock: 10, onOrder: 0, expectedDate: null },
            { code: "181337%", name: "36kV SF6 RMU Tank", quantity: 1, unit: "ADET", warehouse: "B01", minStock: 2, onOrder: 3, expectedDate: "2024-12-20" },
            { code: "142876%", name: "RMU Gaz Sensörü", quantity: 2, unit: "ADET", warehouse: "B01", minStock: 3, onOrder: 4, expectedDate: "2024-12-12" }
        ];
    }
    
    // DEMO: Sipariş verisi
    static async getDemoOrderData() {
        // Demo sipariş verisi
        return [
            { id: "0424-1251", customer: "AYEDAŞ", orderDate: "2024-11-01", deliveryDate: "2024-12-15", cellType: "RM 36 CB", quantity: 2, status: "production" },
            { id: "0424-1245", customer: "BEDAŞ", orderDate: "2024-11-05", deliveryDate: "2024-12-20", cellType: "RM 36 CB", quantity: 3, status: "waiting_material" },
            { id: "0424-1239", customer: "TEİAŞ", orderDate: "2024-11-10", deliveryDate: "2024-12-25", cellType: "RM 36 LB", quantity: 1, status: "production" },
            { id: "0424-1235", customer: "ENERJİSA", orderDate: "2024-11-15", deliveryDate: "2024-12-30", cellType: "RM 36 FL", quantity: 4, status: "planned" }
        ];
    }
    
    // DEMO: Müşteri verisi
    static async getDemoCustomerData() {
        // Demo müşteri verisi
        return [
            { id: "AYEDAŞ", name: "AYEDAŞ", contactName: "Ahmet Yılmaz", phone: "0212 555 11 22", email: "ahmet.yilmaz@ayedas.com" },
            { id: "BEDAŞ", name: "BEDAŞ", contactName: "Mehmet Kaya", phone: "0216 333 44 55", email: "mehmet.kaya@bedas.com" },
            { id: "TEİAŞ", name: "TEİAŞ", contactName: "Ayşe Demir", phone: "0312 444 77 88", email: "ayse.demir@teias.gov.tr" },
            { id: "ENERJİSA", name: "ENERJİSA", contactName: "Fatma Şahin", phone: "0322 666 99 00", email: "fatma.sahin@enerjisa.com" },
            { id: "OSMANİYE", name: "OSMANİYE ELEKTRİK", contactName: "Ali Veli", phone: "0328 123 45 67", email: "ali.veli@osmaniye.com" }
        ];
    }
    
    // DEMO: Malzeme listesi verisi
    static async getDemoMaterialListData(orderType) {
        // Temel malzeme listesi
        const commonMaterials = [
            { code: "137998%", name: "Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC", quantity: 1 },
            { code: "144866%", name: "KAP-80/190-95 Akım Trafosu", quantity: 1 },
            { code: "120170%", name: "M480TB/G-027-95.300UN5 Kablo Başlığı", quantity: 1 },
            { code: "109367%", name: "582mm Bara", quantity: 2 }
        ];
        
        // Hücre tipine göre ek malzemeler
        let specificMaterials = [];
        
        switch (orderType) {
            case "RM 36 CB":
                specificMaterials = [
                    { code: "133278%", name: "36kV 630A Vakum Kesici", quantity: 1 },
                    { code: "104521%", name: "Kilit Seti CB Paneli", quantity: 1 }
                ];
                break;
            case "RM 36 LB":
                specificMaterials = [
                    { code: "125444%", name: "36kV 630A Yük Ayırıcısı", quantity: 1 },
                    { code: "104522%", name: "Kilit Seti LB Paneli", quantity: 1 }
                ];
                break;
            case "RM 36 FL":
                specificMaterials = [
                    { code: "161220%", name: "36kV 200A Sigorta Taşıyıcısı", quantity: 1 },
                    { code: "118332%", name: "24kV 63A HRC Sigorta", quantity: 3 }
                ];
                break;
            case "RMU":
                specificMaterials = [
                    { code: "181337%", name: "36kV SF6 RMU Tank", quantity: 1 },
                    { code: "142876%", name: "RMU Gaz Sensörü", quantity: 1 }
                ];
                break;
            default:
                specificMaterials = [];
        }
        
        return [...commonMaterials, ...specificMaterials];
    }
    
    // DEMO: Stok rezervasyon simülasyonu
    static async simulateStockReservation(materials, orderId) {
        console.log(`Demo stok rezervasyon simülasyonu: Sipariş ${orderId} için ${materials.length} malzeme rezerve edildi`);
        
        // Rezerve edilebilen ve edilemeyen malzemeleri belirle
        const stockData = await this.getDemoStockData();
        
        const result = {
            success: true,
            orderId,
            reservedMaterials: [],
            notAvailableMaterials: []
        };
        
        materials.forEach(material => {
            const stockItem = stockData.find(item => item.code === material.code);
            
            if (stockItem && stockItem.quantity >= material.quantity) {
                // Stokta yeterli malzeme var
                result.reservedMaterials.push({
                    code: material.code,
                    name: material.name,
                    quantity: material.quantity,
                    warehouse: "B01"
                });
            } else {
                // Stokta yeterli malzeme yok
                result.notAvailableMaterials.push({
                    code: material.code,
                    name: material.name || stockItem?.name || "Bilinmeyen Malzeme",
                    requestedQuantity: material.quantity,
                    availableQuantity: stockItem?.quantity || 0,
                    onOrder: stockItem?.onOrder || 0,
                    expectedDate: stockItem?.expectedDate
                });
            }
        });
        
        // Eksik malzeme varsa
        if (result.notAvailableMaterials.length > 0) {
            result.success = false;
        }
        
        // Olay yayınla
        EventBus.emit('stockReservationCompleted', result);
        
        return result;
    }
    
    // DEMO: Sipariş oluşturma simülasyonu
    static async simulateOrderCreation(orderData) {
        console.log("Demo sipariş oluşturma simülasyonu:", orderData);
        
        // Sipariş numarası oluştur (Gerçek tarih + rasgele sayı)
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
        
        const orderId = `${year}${month}-${random}`;
        
        // Teslimat tarihi (şu anki tarihten 30-45 gün sonra)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 30 + Math.floor(Math.random() * 15));
        
        const result = {
            id: orderId,
            ...orderData,
            orderDate: new Date().toISOString().split('T')[0],
            deliveryDate: deliveryDate.toISOString().split('T')[0],
            status: "planned"
        };
        
        // Olay yayınla
        EventBus.emit('newOrderCreated', result);
        
        return result;
    }
}

export default ERPService; 