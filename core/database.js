/**
 * database.js
 * Firestore veritabanı işlemleri
 */

// Koleksiyon referansları
const ordersRef = firebase.firestore().collection('orders');
const materialsRef = firebase.firestore().collection('materials');
const customersRef = firebase.firestore().collection('customers');
const notesRef = firebase.firestore().collection('notes');
const usersRef = firebase.firestore().collection('users');

/**
 * SİPARİŞ İŞLEMLERİ
 */

// Siparişleri getir
async function getOrders(status = null, limit = 50) {
    try {
        let query = ordersRef.orderBy('createdAt', 'desc');
        
        // Duruma göre filtrele
        if (status) {
            if (Array.isArray(status)) {
                // Birden fazla durum varsa where in kullan
                query = query.where('status', 'in', status);
            } else {
                // Tek durum varsa normal where kullan
                query = query.where('status', '==', status);
            }
        }
        
        if (limit) {
            query = query.limit(limit);
        }
        
        const snapshot = await query.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Siparişleri getirme hatası:", error);
        throw error;
    }
}

// Siparişleri filtrele ve getir
async function filterOrders(filters) {
    try {
        let query = ordersRef;
        
        // Filtreler uygulanırsa
        if (filters) {
            // Durum filtresi
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            // Müşteri filtresi
            if (filters.customer) {
                query = query.where('customer', '==', filters.customer);
            }
            
            // Tarih aralığı - sipariş tarihi
            if (filters.orderDateStart && filters.orderDateEnd) {
                query = query.where('orderDate', '>=', filters.orderDateStart)
                             .where('orderDate', '<=', filters.orderDateEnd);
            }
            
            // Tarih aralığı - teslim tarihi
            if (filters.deliveryDateStart && filters.deliveryDateEnd) {
                query = query.where('deliveryDate', '>=', filters.deliveryDateStart)
                             .where('deliveryDate', '<=', filters.deliveryDateEnd);
            }
            
            // Hücre tipi
            if (filters.cellType) {
                query = query.where('cellType', '==', filters.cellType);
            }
        }
        
        // Sıralama
        if (filters && filters.orderBy) {
            query = query.orderBy(filters.orderBy, filters.orderDir || 'asc');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }
        
        // Limit
        if (filters && filters.limit) {
            query = query.limit(filters.limit);
        }
        
        const snapshot = await query.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Siparişleri filtreleme hatası:", error);
        throw error;
    }
}

// Sipariş ekle
async function addOrder(orderData) {
    try {
        // Aktif kullanıcı bilgisini ekle
        const user = firebase.auth().currentUser;
        if (user) {
            orderData.createdBy = user.uid;
        }
        
        // Tarihleri uygun formata çevir
        if (orderData.orderDate && !(orderData.orderDate instanceof Date)) {
            orderData.orderDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.orderDate));
        }
        
        if (orderData.deliveryDate && !(orderData.deliveryDate instanceof Date)) {
            orderData.deliveryDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.deliveryDate));
        }
        
        // Oluşturma ve güncelleme tarihleri
        orderData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        orderData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Varsayılan değerler
        if (!orderData.status) {
            orderData.status = 'planning'; // Varsayılan durum
        }
        
        // Sipariş ekle
        const docRef = await ordersRef.add(orderData);
        
        // Sipariş no oluştur (YYYY-MM-ID formatında)
        const orderNo = generateOrderNumber(docRef.id);
        
        // Sipariş numarasını güncelle
        await ordersRef.doc(docRef.id).update({
            orderNo: orderNo
        });
        
        return {
            id: docRef.id,
            orderNo: orderNo
        };
    } catch (error) {
        console.error("Sipariş ekleme hatası:", error);
        throw error;
    }
}

// Sipariş numarası oluştur
function generateOrderNumber(orderId) {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2); // Son 2 haneli yıl
    const month = ('0' + (now.getMonth() + 1)).slice(-2); // İki haneli ay
    
    return `${year}-${month}-${orderId.substring(0, 4).toUpperCase()}`;
}

// Sipariş güncelle
async function updateOrder(orderId, orderData) {
    try {
        // Güncelleme tarihi ekle
        orderData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Tarihleri uygun formata çevir
        if (orderData.orderDate && !(orderData.orderDate instanceof Date) && typeof orderData.orderDate === 'string') {
            orderData.orderDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.orderDate));
        }
        
        if (orderData.deliveryDate && !(orderData.deliveryDate instanceof Date) && typeof orderData.deliveryDate === 'string') {
            orderData.deliveryDate = firebase.firestore.Timestamp.fromDate(new Date(orderData.deliveryDate));
        }
        
        // Güncelleme yapan kullanıcıyı ekle
        const user = firebase.auth().currentUser;
        if (user) {
            orderData.updatedBy = user.uid;
        }
        
        // Siparişi güncelle
        await ordersRef.doc(orderId).update(orderData);
        
        return true;
    } catch (error) {
        console.error("Sipariş güncelleme hatası:", error);
        throw error;
    }
}

// Sipariş detayını getir
async function getOrderDetail(orderId) {
    try {
        const doc = await ordersRef.doc(orderId).get();
        
        if (!doc.exists) {
            throw new Error('Sipariş bulunamadı');
        }
        
        const orderData = {
            id: doc.id,
            ...doc.data()
        };
        
        // Sipariş malzemelerini getir
        const materialsSnapshot = await materialsRef
            .where('orderId', '==', orderId)
            .get();
            
        orderData.materials = materialsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sipariş notlarını getir
        const notesSnapshot = await notesRef
            .where('entityType', '==', 'order')
            .where('entityId', '==', orderId)
            .orderBy('createdAt', 'desc')
            .get();
            
        orderData.notes = notesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return orderData;
    } catch (error) {
        console.error("Sipariş detayı getirme hatası:", error);
        throw error;
    }
}

// Sipariş durumunu güncelle
async function updateOrderStatus(orderId, status, comment = null) {
    try {
        // Durum güncellemesi
        const updateData = {
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Duruma özel tarih alanı ekle
        const statusDateField = `${status}Date`;
        updateData[statusDateField] = firebase.firestore.FieldValue.serverTimestamp();
        
        // Güncelleme yapan kullanıcıyı ekle
        const user = firebase.auth().currentUser;
        if (user) {
            updateData.updatedBy = user.uid;
        }
        
        // Siparişi güncelle
        await ordersRef.doc(orderId).update(updateData);
        
        // Eğer bir yorum eklenecekse, not olarak kaydet
        if (comment) {
            await addNote({
                entityType: 'order',
                entityId: orderId,
                content: comment,
                type: 'status_change',
                metadata: {
                    oldStatus: '', // Önceki durum bilinmiyor, eklemek için önceki durum sorgulanabilir
                    newStatus: status
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error("Sipariş durumu güncelleme hatası:", error);
        throw error;
    }
}

/**
 * MALZEME İŞLEMLERİ
 */

// Malzemeleri getir
async function getMaterials(filters = null) {
    try {
        let query = materialsRef;
        
        // Filtreler uygulanırsa
        if (filters) {
            // Tedarikçi filtresi
            if (filters.supplier) {
                query = query.where('supplier', '==', filters.supplier);
            }
            
            // Durum filtresi
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            // Sipariş ID filtresi
            if (filters.orderId) {
                query = query.where('orderId', '==', filters.orderId);
            }
            
            // Stok durumu filtresi
            if (filters.hasOwnProperty('inStock') && typeof filters.inStock === 'boolean') {
                query = query.where('inStock', '==', filters.inStock);
            }
        }
        
        // Sıralama
        if (filters && filters.orderBy) {
            query = query.orderBy(filters.orderBy, filters.orderDir || 'asc');
        } else {
            query = query.orderBy('name', 'asc');
        }
        
        const snapshot = await query.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Malzemeleri getirme hatası:", error);
        throw error;
    }
}

// Malzeme ekle veya güncelle
async function addOrUpdateMaterial(materialData) {
    try {
        // Güncelleme mi ekleme mi kontrol et
        if (materialData.id) {
            // Güncelleme
            const id = materialData.id;
            delete materialData.id; // ID'yi data'dan çıkar
            
            // Güncelleme tarihi ekle
            materialData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Malzemeyi güncelle
            await materialsRef.doc(id).update(materialData);
            return { id };
        } else {
            // Yeni malzeme ekleme
            materialData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            materialData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Varsayılan değerler
            if (!materialData.hasOwnProperty('inStock')) {
                materialData.inStock = false;
            }
            
            if (!materialData.stock) {
                materialData.stock = 0;
            }
            
            // Malzeme ekle
            const docRef = await materialsRef.add(materialData);
            return { id: docRef.id };
        }
    } catch (error) {
        console.error("Malzeme ekleme/güncelleme hatası:", error);
        throw error;
    }
}

// Stok güncelle
async function updateStock(materialId, quantity, reason, orderId = null) {
    try {
        // Malzemeyi getir
        const materialDoc = await materialsRef.doc(materialId).get();
        
        if (!materialDoc.exists) {
            throw new Error('Malzeme bulunamadı');
        }
        
        const materialData = materialDoc.data();
        const oldStock = materialData.stock || 0;
        const newStock = oldStock + quantity;
        
        // Stoğu güncelle
        await materialsRef.doc(materialId).update({
            stock: newStock,
            inStock: newStock > 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Stok hareketi ekle
        const stockMovementData = {
            materialId,
            oldStock,
            newStock,
            quantity,
            reason,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (orderId) {
            stockMovementData.orderId = orderId;
        }
        
        // Aktif kullanıcıyı ekle
        const user = firebase.auth().currentUser;
        if (user) {
            stockMovementData.userId = user.uid;
        }
        
        await firebase.firestore().collection('stockMovements').add(stockMovementData);
        
        return { 
            id: materialId, 
            oldStock, 
            newStock 
        };
    } catch (error) {
        console.error("Stok güncelleme hatası:", error);
        throw error;
    }
}

/**
 * MÜŞTERİ İŞLEMLERİ
 */

// Müşterileri getir
async function getCustomers() {
    try {
        const snapshot = await customersRef.orderBy('name', 'asc').get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Müşterileri getirme hatası:", error);
        throw error;
    }
}

// Müşteri ekle
async function addCustomer(customerData) {
    try {
        customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await customersRef.add(customerData);
        return { id: docRef.id };
    } catch (error) {
        console.error("Müşteri ekleme hatası:", error);
        throw error;
    }
}

// Müşteri güncelle
async function updateCustomer(customerId, customerData) {
    try {
        customerData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await customersRef.doc(customerId).update(customerData);
        return { id: customerId };
    } catch (error) {
        console.error("Müşteri güncelleme hatası:", error);
        throw error;
    }
}

/**
 * NOT İŞLEMLERİ
 */

// Notları getir
async function getNotes(entityType = null, entityId = null) {
    try {
        let query = notesRef.orderBy('createdAt', 'desc');
        
        if (entityType) {
            query = query.where('entityType', '==', entityType);
        }
        
        if (entityId) {
            query = query.where('entityId', '==', entityId);
        }
        
        const snapshot = await query.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Notları getirme hatası:", error);
        throw error;
    }
}

// Not ekle
async function addNote(noteData) {
    try {
        // Aktif kullanıcı bilgisini ekle
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await usersRef.doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                noteData.createdBy = {
                    uid: user.uid,
                    name: userData.name || user.displayName || 'Bilinmeyen Kullanıcı',
                    department: userData.department || 'Bilinmeyen Departman'
                };
            } else {
                noteData.createdBy = {
                    uid: user.uid,
                    name: user.displayName || 'Bilinmeyen Kullanıcı',
                    department: 'Bilinmeyen Departman'
                };
            }
        }
        
        // Tarih ekle
        noteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Varsayılan değerler
        if (!noteData.type) {
            noteData.type = 'general';
        }
        
        // Notu ekle
        const docRef = await notesRef.add(noteData);
        return { id: docRef.id };
    } catch (error) {
        console.error("Not ekleme hatası:", error);
        throw error;
    }
}

// Notu güncelle
async function updateNote(noteId, noteData) {
    try {
        // Güncelleme tarihi ekle
        noteData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Notu güncelle
        await notesRef.doc(noteId).update(noteData);
        return { id: noteId };
    } catch (error) {
        console.error("Not güncelleme hatası:", error);
        throw error;
    }
}

// Not sil
async function deleteNote(noteId) {
    try {
        await notesRef.doc(noteId).delete();
        return { id: noteId };
    } catch (error) {
        console.error("Not silme hatası:", error);
        throw error;
    }
}

/**
 * VERİ SEED İŞLEMLERİ
 */

// Örnek veri ekleme (sadece geliştirme aşamasında kullanılır)
async function seedSampleData() {
    try {
        // Örnek müşteriler
        const customers = [
            { name: 'AYEDAŞ', contact: 'Ahmet Yılmaz', email: 'ahmet@ayedas.com.tr', phone: '0212 555 11 22' },
            { name: 'ENERJİSA', contact: 'Mehmet Kaya', email: 'mehmet@enerjisa.com.tr', phone: '0216 333 44 55' },
            { name: 'BAŞKENT EDAŞ', contact: 'Ayşe Demir', email: 'ayse@baskentedas.com.tr', phone: '0312 444 77 88' },
            { name: 'TOROSLAR EDAŞ', contact: 'Fatma Şahin', email: 'fatma@toroslar.com.tr', phone: '0322 666 99 00' }
        ];
        
        for (const customer of customers) {
            customer.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await customersRef.add(customer);
        }
        
        // Örnek malzemeler
        const materials = [
            { name: 'Koruma Rölesi', code: 'Siemens 7SR1003-1JA20-2DA0+ZY20', stock: 5, supplier: 'Siemens', minStock: 2, inStock: true },
            { name: 'Kesici', code: 'ESİTAŞ KAP-80/190-115', stock: 3, supplier: 'Esitaş', minStock: 1, inStock: true },
            { name: 'Kablo Başlıkları', code: 'M480TB/G-027-95.300UN5', stock: 2, supplier: 'Euromold', minStock: 5, inStock: true },
            { name: 'Gerilim Gösterge', code: 'OVI+S (10nf)', stock: 0, supplier: 'Elektra', minStock: 3, inStock: false },
            { name: 'Ayırıcı Motor', code: 'M: 24 VDC B: 24 VDC', stock: 10, supplier: 'Siemens', minStock: 4, inStock: true }
        ];
        
        for (const material of materials) {
            material.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            material.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await materialsRef.add(material);
        }
        
        // Örnek siparişler
        const now = new Date();
        
        const orders = [
            { 
                orderNo: '24-10-1001', 
                customer: 'AYEDAŞ', 
                cellType: 'RM 36 LB', 
                cellCount: 3, 
                orderDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 15)),
                deliveryDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 8)),
                status: 'production',
                hasMaterialIssue: false,
                hasWarning: true
            },
            { 
                orderNo: '24-10-1002', 
                customer: 'BAŞKENT EDAŞ', 
                cellType: 'RM 36 FL', 
                cellCount: 5, 
                orderDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 20)),
                deliveryDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 15)),
                status: 'waiting',
                hasMaterialIssue: true,
                hasWarning: false
            },
            { 
                orderNo: '24-10-1003', 
                customer: 'ENERJİSA', 
                cellType: 'RM 36 CB', 
                cellCount: 4, 
                orderDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 25)),
                deliveryDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 20)),
                status: 'ready',
                hasMaterialIssue: false,
                hasWarning: false
            },
            { 
                orderNo: '24-10-1004', 
                customer: 'TOROSLAR EDAŞ', 
                cellType: 'RM 36 LB', 
                cellCount: 8, 
                orderDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
                deliveryDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 25)),
                status: 'planning',
                hasMaterialIssue: false,
                hasWarning: false
            },
            { 
                orderNo: '24-10-1005', 
                customer: 'AYEDAŞ', 
                cellType: 'RM 36 CB', 
                cellCount: 6, 
                orderDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 5)),
                deliveryDate: firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 2, 5)),
                status: 'planning',
                hasMaterialIssue: false,
                hasWarning: false
            }
        ];
        
        for (const order of orders) {
            order.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            order.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await ordersRef.add(order);
        }
        
        console.log("Örnek veriler başarıyla eklendi");
        return true;
    } catch (error) {
        console.error("Örnek veri ekleme hatası:", error);
        throw error;
    }
}

// Dışa aktarılan fonksiyonlar
export {
    getOrders,
    filterOrders,
    addOrder,
    updateOrder,
    getOrderDetail,
    updateOrderStatus,
    getMaterials,
    addOrUpdateMaterial,
    updateStock,
    getCustomers,
    addCustomer,
    updateCustomer,
    getNotes,
    addNote,
    updateNote,
    deleteNote,
    seedSampleData
};