 /**
 * mock-firebase.js
 * Demo modu için sahte Firebase implementasyonu
 */

// Mock veri
const mockData = {
    users: [
        {
            id: 'demo-user-1',
            email: 'demo@elektrotrack.com',
            name: 'Demo Kullanıcı',
            department: 'Yönetim',
            role: 'admin',
            createdAt: new Date('2024-01-01')
        }
    ],
    orders: [
        {
            id: 'order-1',
            orderNo: '24-03-A001',
            customer: 'AYEDAŞ',
            cellType: 'RM 36 LB',
            cellCount: 3,
            orderDate: new Date('2024-02-15'),
            deliveryDate: new Date('2024-05-20'),
            status: 'production',
            hasMaterialIssue: false,
            hasWarning: true,
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-01')
        },
        {
            id: 'order-2',
            orderNo: '24-03-B002',
            customer: 'BAŞKENT EDAŞ',
            cellType: 'RM 36 FL',
            cellCount: 5,
            orderDate: new Date('2024-02-20'),
            deliveryDate: new Date('2024-05-15'),
            status: 'waiting',
            hasMaterialIssue: true,
            hasWarning: false,
            createdAt: new Date('2024-02-20'),
            updatedAt: new Date('2024-02-28')
        },
        {
            id: 'order-3',
            orderNo: '24-03-C003',
            customer: 'ENERJİSA',
            cellType: 'RM 36 CB',
            cellCount: 4,
            orderDate: new Date('2024-02-25'),
            deliveryDate: new Date('2024-06-10'),
            status: 'ready',
            hasMaterialIssue: false,
            hasWarning: false,
            createdAt: new Date('2024-02-25'),
            updatedAt: new Date('2024-03-05')
        },
        {
            id: 'order-4',
            orderNo: '24-04-D004',
            customer: 'TOROSLAR EDAŞ',
            cellType: 'RM 36 LB',
            cellCount: 8,
            orderDate: new Date('2024-03-01'),
            deliveryDate: new Date('2024-06-25'),
            status: 'planning',
            hasMaterialIssue: false,
            hasWarning: false,
            createdAt: new Date('2024-03-01'),
            updatedAt: new Date('2024-03-01')
        },
        {
            id: 'order-5',
            orderNo: '24-04-E005',
            customer: 'AYEDAŞ',
            cellType: 'RM 36 CB',
            cellCount: 6,
            orderDate: new Date('2024-03-05'),
            deliveryDate: new Date('2024-07-10'),
            status: 'planning',
            hasMaterialIssue: false,
            hasWarning: false,
            createdAt: new Date('2024-03-05'),
            updatedAt: new Date('2024-03-05')
        }
    ],
    materials: [
        {
            id: 'material-1',
            code: 'M480TB/G-027-95.300UN5',
            name: 'Kablo Başlıkları',
            orderId: 'order-2',
            orderNo: '24-03-B002',
            quantity: 10,
            unit: 'Adet',
            inStock: false,
            status: 'ordered',
            supplier: 'Euromold',
            minStock: 5,
            expectedSupplyDate: new Date('2024-05-01'),
            orderNeedDate: new Date('2024-04-20')
        },
        {
            id: 'material-2',
            code: 'OVI+S (10nf)',
            name: 'Gerilim Gösterge',
            orderId: 'order-2',
            orderNo: '24-03-B002',
            quantity: 5,
            unit: 'Adet',
            inStock: false,
            status: 'ordered',
            supplier: 'Elektra',
            minStock: 3,
            expectedSupplyDate: new Date('2024-04-28'),
            orderNeedDate: new Date('2024-04-25')
        },
        {
            id: 'material-3',
            code: 'Siemens 7SR1003-1JA20-2DA0+ZY20',
            name: 'Koruma Rölesi',
            orderId: 'order-1',
            orderNo: '24-03-A001',
            quantity: 3,
            unit: 'Adet',
            inStock: true,
            status: 'available',
            supplier: 'Siemens',
            minStock: 2
        }
    ],
    customers: [
        { id: 'customer-1', name: 'AYEDAŞ', contact: 'Ahmet Yılmaz', email: 'ahmet@ayedas.com.tr', phone: '0212 555 11 22' },
        { id: 'customer-2', name: 'ENERJİSA', contact: 'Mehmet Kaya', email: 'mehmet@enerjisa.com.tr', phone: '0216 333 44 55' },
        { id: 'customer-3', name: 'BAŞKENT EDAŞ', contact: 'Ayşe Demir', email: 'ayse@baskentedas.com.tr', phone: '0312 444 77 88' },
        { id: 'customer-4', name: 'TOROSLAR EDAŞ', contact: 'Fatma Şahin', email: 'fatma@toroslar.com.tr', phone: '0322 666 99 00' }
    ],
    notes: [
        {
            id: 'note-1',
            entityType: 'order',
            entityId: 'order-1',
            content: 'Müşteri ile yapılan görüşmede, teslimat tarihinin çok kritik olduğu vurgulandı.',
            type: 'general',
            createdAt: new Date('2024-03-10'),
            createdBy: {
                uid: 'demo-user-1',
                name: 'Demo Kullanıcı',
                department: 'Yönetim'
            }
        },
        {
            id: 'note-2',
            entityType: 'order',
            entityId: 'order-2',
            content: 'Gerilim gösterge malzemesinin tedarikinde gecikme riski var. Alternatif tedarikçi araştırılıyor.',
            type: 'warning',
            createdAt: new Date('2024-03-12'),
            createdBy: {
                uid: 'demo-user-1',
                name: 'Demo Kullanıcı',
                department: 'Yönetim'
            }
        }
    ]
};

// Firebase Timestamp Simulasyonu
class MockTimestamp {
    constructor(seconds, nanoseconds = 0) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    toDate() {
        return new Date(this.seconds * 1000);
    }

    static now() {
        return new MockTimestamp(Math.floor(Date.now() / 1000));
    }

    static fromDate(date) {
        return new MockTimestamp(Math.floor(date.getTime() / 1000));
    }
}

// Mock Firebase Auth
class MockAuth {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
    }

    onAuthStateChanged(listener) {
        this.listeners.push(listener);
        // Hemen mevcut durumu bildir
        setTimeout(() => {
            listener(this.currentUser);
        }, 0);
        
        // Temizleme fonksiyonu
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    async signInWithEmailAndPassword(email, password) {
        // Demo hesap kontrolü
        if (email === 'demo@elektrotrack.com' && password === 'demo123') {
            this.currentUser = {
                uid: 'demo-user-1',
                email: 'demo@elektrotrack.com',
                displayName: 'Demo Kullanıcı',
                emailVerified: true
            };
            
            // Dinleyicileri bilgilendir
            this.listeners.forEach(listener => listener(this.currentUser));
            
            return { 
                user: this.currentUser,
                operationType: 'signIn'
            };
        }
        
        throw new Error('auth/user-not-found');
    }

    async signOut() {
        this.currentUser = null;
        
        // Dinleyicileri bilgilendir
        this.listeners.forEach(listener => listener(null));
        
        return true;
    }
}

// Mock Firestore
class MockFirestore {
    constructor() {
        this.data = JSON.parse(JSON.stringify(mockData));
        
        // Date nesnelerini geri çevir
        this.convertDatesToObjects(this.data);
        
        console.log('Mock Firestore initialized in demo mode');
        
        // FieldValue simulasyonu
        this.FieldValue = {
            serverTimestamp: () => ({
                _isServerTimestamp: true,
                toDate: () => new Date()
            }),
            arrayUnion: (...elements) => ({
                _isArrayUnion: true,
                elements
            }),
            arrayRemove: (...elements) => ({
                _isArrayRemove: true,
                elements
            }),
            increment: (n) => ({
                _isIncrement: true,
                value: n
            }),
            delete: () => ({
                _isDelete: true
            })
        };
        
        // Timestamp
        this.Timestamp = MockTimestamp;
    }

    // Date stringlerini Date nesnelerine çevir
    convertDatesToObjects(obj) {
        if (!obj) return;
        
        for (let key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key] instanceof Array) {
                    obj[key].forEach(item => this.convertDatesToObjects(item));
                } else {
                    this.convertDatesToObjects(obj[key]);
                }
            }
        }
// Date stringlerini Date nesnelerine çevir
    convertDatesToObjects(obj) {
        if (!obj) return;
        
        for (let key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key] instanceof Array) {
                    obj[key].forEach(item => this.convertDatesToObjects(item));
                } else if (obj[key] instanceof Date) {
                    // Zaten Date nesnesi
                    continue;
                } else if (obj[key].hasOwnProperty('_seconds') && obj[key].hasOwnProperty('_nanoseconds')) {
                    // Firestore Timestamp gibi görünen nesne
                    obj[key] = {
                        toDate: () => new Date(obj[key]._seconds * 1000)
                    };
                } else {
                    this.convertDatesToObjects(obj[key]);
                }
            }
        }
    }

    collection(collectionName) {
        return new MockCollectionReference(this, collectionName);
    }

    doc(path) {
        if (path.includes('/')) {
            const parts = path.split('/');
            const collectionName = parts[0];
            const docId = parts[1];
            return new MockDocumentReference(this, collectionName, docId);
        }
        
        return new MockDocumentReference(this, path);
    }
}

// MockCollectionReference sınıfı
class MockCollectionReference {
    constructor(firestore, collectionName) {
        this.firestore = firestore;
        this.collectionName = collectionName;
    }

    doc(docId) {
        return new MockDocumentReference(this.firestore, this.collectionName, docId);
    }

    where(field, operator, value) {
        return new MockQuery(this.firestore, this.collectionName, [{field, operator, value}]);
    }

    orderBy(field, direction = 'asc') {
        return new MockQuery(this.firestore, this.collectionName, [], [{field, direction}]);
    }

    limit(n) {
        return new MockQuery(this.firestore, this.collectionName, [], [], n);
    }

    async get() {
        // Koleksiyondaki tüm belgeleri döndür
        const data = this.firestore.data[this.collectionName] || [];
        
        return this._createQuerySnapshot(data);
    }

    _createQuerySnapshot(data) {
        const docs = data.map(item => {
            return {
                id: item.id,
                data: () => ({...item}),
                exists: true,
                ref: new MockDocumentReference(this.firestore, this.collectionName, item.id)
            };
        });
        
        return {
            docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback)
        };
    }

    async add(data) {
        // Yeni belge ID'si oluştur
        const id = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newData = { 
            ...data,
            id
        };
        
        // ServerTimestamp'ları işle
        this._processServerTimestamps(newData);
        
        // Belgeyi koleksiyona ekle
        if (!this.firestore.data[this.collectionName]) {
            this.firestore.data[this.collectionName] = [];
        }
        
        this.firestore.data[this.collectionName].push(newData);
        
        // Belge referansını döndür
        return new MockDocumentReference(this.firestore, this.collectionName, id);
    }

    _processServerTimestamps(data) {
        if (!data) return;
        
        for (let key in data) {
            if (data[key] && typeof data[key] === 'object') {
                if (data[key]._isServerTimestamp) {
                    data[key] = {
                        toDate: () => new Date(),
                        _seconds: Math.floor(Date.now() / 1000),
                        _nanoseconds: 0
                    };
                } else if (Array.isArray(data[key])) {
                    data[key].forEach(item => {
                        if (typeof item === 'object') {
                            this._processServerTimestamps(item);
                        }
                    });
                } else {
                    this._processServerTimestamps(data[key]);
                }
            }
        }
    }
}

// MockDocumentReference sınıfı
class MockDocumentReference {
    constructor(firestore, collectionName, docId) {
        this.firestore = firestore;
        this.collectionName = collectionName;
        this.id = docId;
        this.path = docId ? `${collectionName}/${docId}` : collectionName;
    }

    collection(collectionName) {
        return new MockCollectionReference(this.firestore, `${this.path}/${collectionName}`);
    }

    async get() {
        if (!this.id) {
            throw new Error('Document ID is required');
        }
        
        const collection = this.firestore.data[this.collectionName] || [];
        const doc = collection.find(item => item.id === this.id);
        
        if (!doc) {
            return {
                exists: false,
                data: () => null,
                id: this.id,
                ref: this
            };
        }
        
        return {
            exists: true,
            data: () => ({...doc}),
            id: this.id,
            ref: this
        };
    }

    async set(data, options) {
        // Koleksiyonu oluştur (yoksa)
        if (!this.firestore.data[this.collectionName]) {
            this.firestore.data[this.collectionName] = [];
        }
        
        // ServerTimestamp'ları işle
        const collectionRef = new MockCollectionReference(this.firestore, this.collectionName);
        collectionRef._processServerTimestamps(data);
        
        const collection = this.firestore.data[this.collectionName];
        const index = collection.findIndex(doc => doc.id === this.id);
        
        if (index === -1) {
            // Yeni belge ekle
            collection.push({
                ...data,
                id: this.id
            });
        } else {
            // Varolan belgeyi güncelle
            if (options && options.merge) {
                collection[index] = {
                    ...collection[index],
                    ...data
                };
            } else {
                collection[index] = {
                    ...data,
                    id: this.id
                };
            }
        }
        
        return this;
    }

    async update(data) {
        // Koleksiyon var mı kontrol et
        if (!this.firestore.data[this.collectionName]) {
            throw new Error(`Collection ${this.collectionName} does not exist`);
        }
        
        // Belge var mı kontrol et
        const collection = this.firestore.data[this.collectionName];
        const index = collection.findIndex(doc => doc.id === this.id);
        
        if (index === -1) {
            throw new Error(`Document with ID ${this.id} does not exist`);
        }
        
        // ServerTimestamp'ları işle
        const collectionRef = new MockCollectionReference(this.firestore, this.collectionName);
        collectionRef._processServerTimestamps(data);
        
        // Belgeyi güncelle
        collection[index] = {
            ...collection[index],
            ...data
        };
        
        return this;
    }

    async delete() {
        // Koleksiyon var mı kontrol et
        if (!this.firestore.data[this.collectionName]) {
            return; // Silecek bir şey yok
        }
        
        // Belgeyi sil
        const collection = this.firestore.data[this.collectionName];
        const index = collection.findIndex(doc => doc.id === this.id);
        
        if (index !== -1) {
            collection.splice(index, 1);
        }
        
        return true;
    }
}

// MockQuery sınıfı
class MockQuery {
    constructor(firestore, collectionName, filters = [], orderBys = [], limitVal = null) {
        this.firestore = firestore;
        this.collectionName = collectionName;
        this.filters = filters;
        this.orderBys = orderBys;
        this.limitVal = limitVal;
    }

    where(field, operator, value) {
        this.filters.push({field, operator, value});
        return this;
    }

    orderBy(field, direction = 'asc') {
        this.orderBys.push({field, direction});
        return this;
    }

    limit(n) {
        this.limitVal = n;
        return this;
    }

    async get() {
        // Koleksiyonu al
        let data = this.firestore.data[this.collectionName] || [];
        
        // Filtreleri uygula
        if (this.filters.length > 0) {
            data = this._applyFilters(data);
        }
        
        // Sıralamayı uygula
        if (this.orderBys.length > 0) {
            data = this._applyOrderBy(data);
        }
        
        // Limiti uygula
        if (this.limitVal !== null && this.limitVal < data.length) {
            data = data.slice(0, this.limitVal);
        }
        
        // QuerySnapshot oluştur
        return this._createQuerySnapshot(data);
    }

    _applyFilters(data) {
        return data.filter(doc => {
            // Tüm filtreler için AND operatörü uygula
            return this.filters.every(filter => {
                const { field, operator, value } = filter;
                
                // Nokta notasyonuyla iç içe alanları destekle
                const fieldValue = this._getFieldValue(doc, field);
                
                switch (operator) {
                    case '==':
                        return this._isEqual(fieldValue, value);
                    case '!=':
                        return !this._isEqual(fieldValue, value);
                    case '>':
                        return fieldValue > value;
                    case '>=':
                        return fieldValue >= value;
                    case '<':
                        return fieldValue < value;
                    case '<=':
                        return fieldValue <= value;
                    case 'array-contains':
                        return Array.isArray(fieldValue) && fieldValue.some(item => this._isEqual(item, value));
                    case 'array-contains-any':
                        return Array.isArray(fieldValue) && Array.isArray(value) && 
                               value.some(v => fieldValue.some(item => this._isEqual(item, v)));
                    case 'in':
                        return Array.isArray(value) && value.some(v => this._isEqual(fieldValue, v));
                    case 'not-in':
                        return Array.isArray(value) && !value.some(v => this._isEqual(fieldValue, v));
                    default:
                        console.warn(`Unsupported operator: ${operator}`);
                        return true;
                }
            });
        });
    }

    _getFieldValue(doc, field) {
        // Nokta notasyonuyla iç içe alanları destekle: 'user.name'
        const parts = field.split('.');
        let value = doc;
        
        for (const part of parts) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[part];
        }
        
        // Timestamp nesnelerini Date'e çevir
        if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
            return value.toDate();
        }
        
        return value;
    }

    _isEqual(a, b) {
        // Date nesnelerini karşılaştır
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime();
        }
        
        // Timestamp nesnelerini karşılaştır
        if (a && typeof a === 'object' && a.toDate && typeof a.toDate === 'function') {
            const dateA = a.toDate();
            if (b instanceof Date) {
                return dateA.getTime() === b.getTime();
            } else if (b && typeof b === 'object' && b.toDate && typeof b.toDate === 'function') {
                return dateA.getTime() === b.toDate().getTime();
            }
        }
        
        // Temel karşılaştırma
        return a === b;
    }

    _applyOrderBy(data) {
        // Sıralama uygulamaları
        return [...data].sort((a, b) => {
            for (const order of this.orderBys) {
                const { field, direction } = order;
                
                // Alanları al
                const valueA = this._getFieldValue(a, field);
                const valueB = this._getFieldValue(b, field);
                
                // Sıralamaya göre karşılaştır
                const result = this._compare(valueA, valueB);
                
                if (result !== 0) {
                    return direction === 'asc' ? result : -result;
                }
            }
            
            return 0;
        });
    }

    _compare(a, b) {
        // null ve undefined karşılaştırması
        if (a === undefined || a === null) {
            return b === undefined || b === null ? 0 : -1;
        }
        if (b === undefined || b === null) {
            return 1;
        }
        
        // Date nesneleri için
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() - b.getTime();
        }
        
        // Timestamp nesneleri için
        if (a && typeof a === 'object' && a.toDate && typeof a.toDate === 'function') {
            if (b && typeof b === 'object' && b.toDate && typeof b.toDate === 'function') {
                return a.toDate().getTime() - b.toDate().getTime();
            }
            return a.toDate().getTime() - (b instanceof Date ? b.getTime() : 0);
        }
        
        // String karşılaştırma
        if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
        }
        
        // Sayı karşılaştırma
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        
        // Boolean karşılaştırma
        if (typeof a === 'boolean' && typeof b === 'boolean') {
            return a === b ? 0 : (a ? 1 : -1);
        }
        
        // Diğer tipler için
        return String(a).localeCompare(String(b));
    }

    _createQuerySnapshot(data) {
        const docs = data.map(item => {
            return {
                id: item.id,
                data: () => ({...item}),
                exists: true,
                ref: new MockDocumentReference(this.firestore, this.collectionName, item.id)
            };
        });
        
        return {
            docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback)
        };
    }
}

// Firebase global nesne
let mockFirebase = {
    // Firebase Auth
    auth: () => new MockAuth(),
    
    // Firebase Firestore
    firestore: () => {
        const firestoreInstance = new MockFirestore();
        
        // Firestore instance özel alanları
        firestoreInstance.enablePersistence = async () => {
            console.log("Mock persistence enabled");
            return true;
        };
        
        return firestoreInstance;
    },
    
    // Firebase Analytics (dummy)
    analytics: () => {
        return {
            logEvent: (eventName, eventParams) => {
                console.log("Mock Analytics event:", eventName, eventParams);
            }
        };
    },
    
    // Uygulama nesnesi
    apps: [],
    
    // Firebase App
    initializeApp: (config) => {
        console.log("Mock Firebase initialized with config:", config);
        mockFirebase.apps.push({});
        return {};
    },
    
    app: () => ({})
};

// Firebase global nesnesine ata
if (typeof window !== 'undefined') {
    window.firebase = mockFirebase;
    console.log("Mock Firebase globally available");
}

// Mock Firebase'in yüklendiğini belirt
console.log("Mock Firebase loaded successfully");