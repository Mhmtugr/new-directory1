/**
 * material-lists.js
 * Malzeme listeleri yönetimi ve işlevleri
 */

// Global değişkenler
let currentListId = null;
let materialLists = [];
let materials = [];

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    // Malzeme listelerini yükle
    loadMaterialLists();
    
    // Tab değişikliği olayını dinle
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Form gönderimlerini engelle
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    });
});

// Malzeme listelerini yükle
async function loadMaterialLists() {
    try {
        const tableBody = document.querySelector('#material-lists-table tbody');
        
        // Yükleniyor mesajı
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Yükleniyor...</td></tr>';
        
        // API'den veri çekme
        try {
            // Firebase'den malzeme listelerini getir
            if (firebase && firebase.firestore) {
                const snapshot = await firebase.firestore().collection('materialLists').get();
                
                materialLists = [];
                snapshot.forEach(doc => {
                    materialLists.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Tablo içeriğini oluştur
                renderMaterialListsTable();
            } else {
                // Demo veriler
                materialLists = getExampleMaterialLists();
                renderMaterialListsTable();
            }
        } catch (error) {
            console.error("Malzeme listeleri yüklenirken hata:", error);
            
            // Demo veriler
            materialLists = getExampleMaterialLists();
            renderMaterialListsTable();
        }
    } catch (error) {
        console.error("Sayfa yüklenirken hata:", error);
        const tableBody = document.querySelector('#material-lists-table tbody');
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Hata: ${error.message}</td></tr>`;
    }
}

// Malzeme listeleri tablosunu oluştur
function renderMaterialListsTable() {
    const tableBody = document.querySelector('#material-lists-table tbody');
    
    // Liste boşsa
    if (!materialLists || materialLists.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Kayıtlı malzeme listesi bulunamadı</td></tr>';
        return;
    }
    
    // Tablo satırlarını oluştur
    let html = '';
    
    materialLists.forEach(list => {
        const updatedDate = list.updatedAt ? new Date(list.updatedAt.toDate ? list.updatedAt.toDate() : list.updatedAt).toLocaleDateString('tr-TR') : '-';
        
        html += `
            <tr onclick="showMaterialListDetail('${list.id}')" style="cursor: pointer;">
                <td>${list.listCode || ''}</td>
                <td>${list.listType === 'primer' ? 'Primer' : 'Sekonder'}</td>
                <td>${list.cellType || ''}</td>
                <td>${list.technicalDetails || ''}</td>
                <td>${list.materialsCount || 0}</td>
                <td>${updatedDate}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); showMaterialListDetail('${list.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); duplicateMaterialList('${list.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteMaterialList('${list.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Malzeme listesi filtreleme
function filterMaterialLists() {
    const searchText = document.querySelector('.search-input').value.toLowerCase();
    const listTypeFilter = document.querySelector('.filter-item select:nth-child(1)').value;
    const cellTypeFilter = document.querySelector('.filter-item select:nth-child(2)').value;
    
    // Tüm satırları kontrol et
    const rows = document.querySelectorAll('#material-lists-table tbody tr');
    
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
        
        // Liste tipi filtresi
        if (listTypeFilter && showRow) {
            const typeCell = row.querySelector('td:nth-child(2)');
            if (typeCell) {
                const type = typeCell.textContent.toLowerCase();
                if (listTypeFilter === 'primer' && type !== 'primer') {
                    showRow = false;
                } else if (listTypeFilter === 'sekonder' && type !== 'sekonder') {
                    showRow = false;
                }
            }
        }
        
        // Hücre tipi filtresi
        if (cellTypeFilter && showRow) {
            const cellTypeCell = row.querySelector('td:nth-child(3)');
            if (cellTypeCell) {
                const cellType = cellTypeCell.textContent;
                if (!cellType.includes(cellTypeFilter)) {
                    showRow = false;
                }
            }
        }
        
        // Satırı göster/gizle
        row.style.display = showRow ? '' : 'none';
    });
}

// Malzeme listesi detayını göster
async function showMaterialListDetail(listId) {
    try {
        currentListId = listId;
        
        // Modal başlığını güncelle
        const listIdElement = document.getElementById('material-list-id');
        listIdElement.textContent = listId;
        
        // Liste bilgilerini getir
        const list = materialLists.find(list => list.id === listId);
        
        if (!list) {
            throw new Error('Malzeme listesi bulunamadı');
        }
        
        // Form alanlarını doldur
        document.querySelector('#list-general input[name="listCode"]').value = list.listCode || '';
        document.querySelector('#list-general select[name="listType"]').value = list.listType || 'primer';
        document.querySelector('#list-general input[name="cellType"]').value = list.cellType || '';
        document.querySelector('#list-general input[name="technicalDetails"]').value = list.technicalDetails || '';
        document.querySelector('#list-general textarea[name="description"]').value = list.description || '';
        
        // Malzemeleri yükle
        await loadMaterials(listId);
        
        // Modalı göster
        showModal('material-list-detail-modal');
    } catch (error) {
        console.error("Malzeme listesi detayı yüklenirken hata:", error);
        showToast("Malzeme listesi detayı yüklenemedi: " + error.message, "error");
    }
}

// Malzeme listesine ait malzemeleri yükle
async function loadMaterials(listId) {
    try {
        const tableBody = document.querySelector('#materials-table tbody');
        
        // Yükleniyor mesajı
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Yükleniyor...</td></tr>';
        
        // Malzemeleri getir
        try {
            if (firebase && firebase.firestore) {
                const snapshot = await firebase.firestore().collection('materials')
                    .where('listId', '==', listId)
                    .get();
                
                materials = [];
                snapshot.forEach(doc => {
                    materials.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Malzemeleri tabloya doldur
                renderMaterialsTable();
            } else {
                // Demo malzemeler
                materials = getExampleMaterials(listId);
                renderMaterialsTable();
            }
        } catch (error) {
            console.error("Malzemeler yüklenirken hata:", error);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Hata: ${error.message}</td></tr>`;
            
            // Demo malzemeler
            materials = getExampleMaterials(listId);
            renderMaterialsTable();
        }
    } catch (error) {
        console.error("Malzemeler yüklenirken hata:", error);
        const tableBody = document.querySelector('#materials-table tbody');
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Hata: ${error.message}</td></tr>`;
    }
}

// Malzemeler tablosunu doldur
function renderMaterialsTable() {
    const tableBody = document.querySelector('#materials-table tbody');
    
    // Liste boşsa
    if (!materials || materials.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Bu listeye ait malzeme bulunamadı</td></tr>';
        return;
    }
    
    // Tablo satırlarını oluştur
    let html = '';
    
    materials.forEach(material => {
        html += `
            <tr>
                <td>${material.materialCode || ''}</td>
                <td>${material.caniasCode || ''}</td>
                <td>${material.materialName || ''}</td>
                <td>${material.quantity || 1}</td>
                <td>${material.unit || 'Adet'}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editMaterial('${material.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMaterial('${material.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Yeni malzeme listesi ekleme modalını göster
function showAddMaterialListModal() {
    currentListId = null;
    
    // Form alanlarını temizle
    document.querySelector('#list-general input[name="listCode"]').value = generateListCode();
    document.querySelector('#list-general select[name="listType"]').value = 'primer';
    document.querySelector('#list-general input[name="cellType"]').value = '';
    document.querySelector('#list-general input[name="technicalDetails"]').value = '';
    document.querySelector('#list-general textarea[name="description"]').value = '';
    
    // Malzemeler tablosunu temizle
    document.querySelector('#materials-table tbody').innerHTML = '<tr><td colspan="6" class="text-center">Önce listeyi kaydedin</td></tr>';
    
    // Modalı göster
    showModal('material-list-detail-modal');
    
    // İlk tab'ı aktif et
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector('.tab[data-tab="list-info"]').classList.add('active');
    document.querySelector('#list-info-content').classList.add('active');
}

// Malzeme listesi kodu oluştur
function generateListCode() {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    
    // Son liste kodunu bul
    let lastCode = 0;
    materialLists.forEach(list => {
        if (list.listCode && list.listCode.startsWith(`ML-${year}${month}`)) {
            const codeNumber = parseInt(list.listCode.split('-')[2]);
            if (codeNumber > lastCode) {
                lastCode = codeNumber;
            }
        }
    });
    
    // Yeni kodu oluştur
    return `ML-${year}${month}-${(lastCode + 1).toString().padStart(3, '0')}`;
}

// Malzeme listesini kaydet
async function saveMaterialList() {
    try {
        // Form verilerini topla
        const listCode = document.querySelector('#list-general input[name="listCode"]').value;
        const listType = document.querySelector('#list-general select[name="listType"]').value;
        const cellType = document.querySelector('#list-general input[name="cellType"]').value;
        const technicalDetails = document.querySelector('#list-general input[name="technicalDetails"]').value;
        const description = document.querySelector('#list-general textarea[name="description"]').value;
        
        // Validasyon
        if (!listCode || !listType || !cellType) {
            showToast("Liste kodu, tipi ve hücre tipi zorunludur", "error");
            return;
        }
        
        // Liste verisini oluştur
        const listData = {
            listCode,
            listType,
            cellType,
            technicalDetails,
            description,
            materialsCount: materials.length,
            updatedAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        };
        
        // Firebase'e kaydet
        if (firebase && firebase.firestore) {
            if (currentListId) {
                // Mevcut listeyi güncelle
                await firebase.firestore().collection('materialLists').doc(currentListId).update(listData);
                showToast("Malzeme listesi güncellendi", "success");
            } else {
                // Yeni liste oluştur
                const docRef = await firebase.firestore().collection('materialLists').add({
                    ...listData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentListId = docRef.id;
                showToast("Malzeme listesi oluşturuldu", "success");
            }
            
            // Listeleri yenile
            loadMaterialLists();
        } else {
            // Demo mod
            if (currentListId) {
                // Mevcut listeyi güncelle
                const index = materialLists.findIndex(list => list.id === currentListId);
                if (index !== -1) {
                    materialLists[index] = {
                        ...materialLists[index],
                        ...listData,
                        updatedAt: new Date()
                    };
                }
                showToast("Malzeme listesi güncellendi (Demo)", "success");
            } else {
                // Yeni liste oluştur
                const newList = {
                    id: 'list-' + Date.now(),
                    ...listData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                materialLists.push(newList);
                currentListId = newList.id;
                showToast("Malzeme listesi oluşturuldu (Demo)", "success");
            }
            
            // Tabloyu güncelle
            renderMaterialListsTable();
        }
        
        // İkinci tab'a geç
        if (!currentListId) {
            switchTab('materials');
        }
    } catch (error) {
        console.error("Malzeme listesi kaydedilirken hata:", error);
      showToast("Malzeme listesi kaydedilemedi: " + error.message, "error");
    }
}

// Malzeme listesini sil
async function deleteMaterialList(listId) {
    try {
        // Kullanıcı onayı
        if (!confirm("Bu malzeme listesini silmek istediğinizden emin misiniz?")) {
            return;
        }
        
        // Firebase'den sil
        if (firebase && firebase.firestore) {
            await firebase.firestore().collection('materialLists').doc(listId).delete();
            
            // Liste ile ilişkili malzemeleri sil
            const materialsSnapshot = await firebase.firestore().collection('materials')
                .where('listId', '==', listId)
                .get();
            
            const batch = firebase.firestore().batch();
            materialsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            showToast("Malzeme listesi silindi", "success");
        } else {
            // Demo mod
            const index = materialLists.findIndex(list => list.id === listId);
            if (index !== -1) {
                materialLists.splice(index, 1);
                showToast("Malzeme listesi silindi (Demo)", "success");
            }
        }
        
        // Listeyi yenile
        loadMaterialLists();
    } catch (error) {
        console.error("Malzeme listesi silinirken hata:", error);
        showToast("Malzeme listesi silinemedi: " + error.message, "error");
    }
}

// Malzeme listesini kopyala
async function duplicateMaterialList(listId) {
    try {
        // Kopyalanacak listeyi bul
        const sourceList = materialLists.find(list => list.id === listId);
        
        if (!sourceList) {
            throw new Error('Kaynak liste bulunamadı');
        }
        
        // Yeni liste kodu oluştur
        const newListCode = generateListCode();
        
        // Yeni liste verisi
        const newListData = {
            listCode: newListCode,
            listType: sourceList.listType,
            cellType: sourceList.cellType,
            technicalDetails: sourceList.technicalDetails,
            description: sourceList.description + ' (Kopya)',
            materialsCount: sourceList.materialsCount || 0,
            createdAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            updatedAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        };
        
        let newListId;
        
        // Firebase'e kaydet
        if (firebase && firebase.firestore) {
            // Yeni listeyi oluştur
            const docRef = await firebase.firestore().collection('materialLists').add(newListData);
            newListId = docRef.id;
            
            // Malzemeleri kopyala
            const materialsSnapshot = await firebase.firestore().collection('materials')
                .where('listId', '==', listId)
                .get();
            
            if (!materialsSnapshot.empty) {
                const batch = firebase.firestore().batch();
                materialsSnapshot.forEach(doc => {
                    const materialData = doc.data();
                    const newMaterialRef = firebase.firestore().collection('materials').doc();
                    
                    batch.set(newMaterialRef, {
                        ...materialData,
                        listId: newListId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                await batch.commit();
            }
            
            showToast("Malzeme listesi kopyalandı", "success");
        } else {
            // Demo mod
            const newList = {
                id: 'list-' + Date.now(),
                ...newListData
            };
            materialLists.push(newList);
            newListId = newList.id;
            
            // Malzemeleri kopyala
            const sourceMaterials = getExampleMaterials(listId);
            const newMaterials = sourceMaterials.map(material => ({
                ...material,
                id: 'material-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                listId: newListId
            }));
            
            // Demo materyaller dizisini güncelle
            showToast("Malzeme listesi kopyalandı (Demo)", "success");
        }
        
        // Listeleri yenile
        loadMaterialLists();
    } catch (error) {
        console.error("Malzeme listesi kopyalanırken hata:", error);
        showToast("Malzeme listesi kopyalanamadı: " + error.message, "error");
    }
}

// Yeni malzeme ekleme modalını göster
function addMaterial() {
    // Eğer liste henüz kaydedilmediyse uyar
    if (!currentListId) {
        showToast("Önce malzeme listesini kaydedin", "warning");
        return;
    }
    
    // Form alanlarını temizle
    const form = document.getElementById('material-form');
    form.reset();
    
    // Modalı göster
    showModal('add-material-modal');
}

// Malzeme düzenleme modalını göster
function editMaterial(materialId) {
    // Malzemeyi bul
    const material = materials.find(m => m.id === materialId);
    
    if (!material) {
        showToast("Malzeme bulunamadı", "error");
        return;
    }
    
    // Form alanlarını doldur
    const form = document.getElementById('material-form');
    form.querySelector('input[name="materialCode"]').value = material.materialCode || '';
    form.querySelector('input[name="caniasCode"]').value = material.caniasCode || '';
    form.querySelector('input[name="materialName"]').value = material.materialName || '';
    form.querySelector('input[name="quantity"]').value = material.quantity || 1;
    form.querySelector('select[name="unit"]').value = material.unit || 'Adet';
    form.querySelector('textarea[name="description"]').value = material.description || '';
    
    // Malzeme ID'sini form özelliği olarak sakla
    form.setAttribute('data-material-id', materialId);
    
    // Modalı göster
    showModal('add-material-modal');
}

// Malzeme bilgilerini kaydet
async function saveMaterial() {
    try {
        // Form verilerini al
        const form = document.getElementById('material-form');
        const materialCode = form.querySelector('input[name="materialCode"]').value;
        const caniasCode = form.querySelector('input[name="caniasCode"]').value;
        const materialName = form.querySelector('input[name="materialName"]').value;
        const quantity = parseInt(form.querySelector('input[name="quantity"]').value) || 1;
        const unit = form.querySelector('select[name="unit"]').value;
        const description = form.querySelector('textarea[name="description"]').value;
        
        // Validasyon
        if (!materialCode || !materialName) {
            showToast("Malzeme kodu ve adı zorunludur", "error");
            return;
        }
        
        // Düzenleme mi yoksa yeni ekleme mi?
        const materialId = form.getAttribute('data-material-id');
        
        // Malzeme verisini oluştur
        const materialData = {
            materialCode,
            caniasCode,
            materialName,
            quantity,
            unit,
            description,
            listId: currentListId,
            updatedAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        };
        
        // Firebase'e kaydet
        if (firebase && firebase.firestore) {
            if (materialId) {
                // Mevcut malzemeyi güncelle
                await firebase.firestore().collection('materials').doc(materialId).update(materialData);
                showToast("Malzeme güncellendi", "success");
            } else {
                // Yeni malzeme ekle
                materialData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firebase.firestore().collection('materials').add(materialData);
                showToast("Malzeme eklendi", "success");
                
                // Liste malzeme sayısını güncelle
                await firebase.firestore().collection('materialLists').doc(currentListId).update({
                    materialsCount: firebase.firestore.FieldValue.increment(1),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            // Demo mod
            if (materialId) {
                // Mevcut malzemeyi güncelle
                const index = materials.findIndex(m => m.id === materialId);
                if (index !== -1) {
                    materials[index] = {
                        ...materials[index],
                        ...materialData,
                        updatedAt: new Date()
                    };
                }
                showToast("Malzeme güncellendi (Demo)", "success");
            } else {
                // Yeni malzeme ekle
                const newMaterial = {
                    id: 'material-' + Date.now(),
                    ...materialData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                materials.push(newMaterial);
                showToast("Malzeme eklendi (Demo)", "success");
                
                // Liste malzeme sayısını güncelle
                const listIndex = materialLists.findIndex(list => list.id === currentListId);
                if (listIndex !== -1) {
                    materialLists[listIndex].materialsCount = (materialLists[listIndex].materialsCount || 0) + 1;
                    materialLists[listIndex].updatedAt = new Date();
                }
            }
        }
        
        // Malzemeleri yenile
        loadMaterials(currentListId);
        
        // Modalı kapat
        closeModal('add-material-modal');
        
        // Form veri özniteliğini temizle
        form.removeAttribute('data-material-id');
    } catch (error) {
        console.error("Malzeme kaydedilirken hata:", error);
        showToast("Malzeme kaydedilemedi: " + error.message, "error");
    }
}

// Malzeme sil
async function deleteMaterial(materialId) {
    try {
        // Kullanıcı onayı
        if (!confirm("Bu malzemeyi silmek istediğinizden emin misiniz?")) {
            return;
        }
        
        // Firebase'den sil
        if (firebase && firebase.firestore) {
            await firebase.firestore().collection('materials').doc(materialId).delete();
            
            // Liste malzeme sayısını güncelle
            await firebase.firestore().collection('materialLists').doc(currentListId).update({
                materialsCount: firebase.firestore.FieldValue.increment(-1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast("Malzeme silindi", "success");
        } else {
            // Demo mod
            const index = materials.findIndex(m => m.id === materialId);
            if (index !== -1) {
                materials.splice(index, 1);
                showToast("Malzeme silindi (Demo)", "success");
                
                // Liste malzeme sayısını güncelle
                const listIndex = materialLists.findIndex(list => list.id === currentListId);
                if (listIndex !== -1) {
                    materialLists[listIndex].materialsCount = (materialLists[listIndex].materialsCount || 0) - 1;
                    materialLists[listIndex].updatedAt = new Date();
                }
            }
        }
        
        // Malzemeleri yenile
        loadMaterials(currentListId);
    } catch (error) {
        console.error("Malzeme silinirken hata:", error);
        showToast("Malzeme silinemedi: " + error.message, "error");
    }
}

// Excel'den malzeme listesi içe aktar
function importMaterials() {
    // Eğer liste henüz kaydedilmediyse uyar
    if (!currentListId) {
        showToast("Önce malzeme listesini kaydedin", "warning");
        return;
    }
    
    // Input elementi oluştur
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    
    // Dosya seçme olayını dinle
    input.addEventListener('change', async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;
            
            // Dosya tipini kontrol et
            if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
                showToast("Lütfen geçerli bir Excel veya CSV dosyası seçin", "error");
                return;
            }
            
            showToast("Dosya işleniyor, lütfen bekleyin...", "info");
            
            // Excel kitaplığını yükle (bu kısım gerçek uygulamada asenkron olarak yapılmalı)
            // Bu örnekte API üzerinden dosya işleniyor kabul edelim
            
            // Demo için malzeme listesi
            setTimeout(() => {
                const demoMaterials = [
                    { code: 'MLZ-001', caniasCode: '123456%', name: 'Koruma Rölesi', quantity: 1, unit: 'Adet' },
                    { code: 'MLZ-002', caniasCode: '789012%', name: 'Akım Trafosu', quantity: 3, unit: 'Adet' },
                    { code: 'MLZ-003', caniasCode: '345678%', name: 'Kablo Başlığı', quantity: 6, unit: 'Adet' },
                    { code: 'MLZ-004', caniasCode: '901234%', name: 'Bağlantı Parçası', quantity: 12, unit: 'Adet' },
                    { code: 'MLZ-005', caniasCode: '567890%', name: 'Bara Bağlantı', quantity: 4, unit: 'Adet' },
                ];
                
                // Malzemeleri ekle
                importMaterialsFromData(demoMaterials);
            }, 1500);
        } catch (error) {
            console.error("Excel işlenirken hata:", error);
            showToast("Excel dosyası işlenemedi: " + error.message, "error");
        }
    });
    
    // Dosya seçme penceresini aç
    input.click();
}

// Excel verilerinden malzemeleri ekle
async function importMaterialsFromData(data) {
    try {
        // Eğer veri yoksa
        if (!data || data.length === 0) {
            showToast("İçe aktarılacak malzeme bulunamadı", "warning");
            return;
        }
        
        let successCount = 0;
        
        // Firebase batch işlemi (çoklu işlem)
        if (firebase && firebase.firestore) {
            const batch = firebase.firestore().batch();
            
            data.forEach(item => {
                const materialData = {
                    materialCode: item.code,
                    caniasCode: item.caniasCode,
                    materialName: item.name,
                    quantity: parseInt(item.quantity) || 1,
                    unit: item.unit || 'Adet',
                    description: item.description || '',
                    listId: currentListId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const newMaterialRef = firebase.firestore().collection('materials').doc();
                batch.set(newMaterialRef, materialData);
                successCount++;
            });
            
            // Batch işlemini gerçekleştir
            await batch.commit();
            
            // Liste malzeme sayısını güncelle
            await firebase.firestore().collection('materialLists').doc(currentListId).update({
                materialsCount: firebase.firestore.FieldValue.increment(successCount),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Demo mod
            data.forEach(item => {
                const newMaterial = {
                    id: 'material-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    materialCode: item.code,
                    caniasCode: item.caniasCode,
                    materialName: item.name,
                    quantity: parseInt(item.quantity) || 1,
                    unit: item.unit || 'Adet',
                    description: item.description || '',
                    listId: currentListId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                materials.push(newMaterial);
                successCount++;
            });
            
            // Liste malzeme sayısını güncelle
            const listIndex = materialLists.findIndex(list => list.id === currentListId);
            if (listIndex !== -1) {
                materialLists[listIndex].materialsCount = (materialLists[listIndex].materialsCount || 0) + successCount;
                materialLists[listIndex].updatedAt = new Date();
            }
        }
        
        // Başarı mesajı
        showToast(`${successCount} malzeme başarıyla içe aktarıldı`, "success");
        
        // Malzemeleri yenile
        loadMaterials(currentListId);
    } catch (error) {
        console.error("Malzemeler içe aktarılırken hata:", error);
        showToast("Malzemeler içe aktarılamadı: " + error.message, "error");
    }
}

// Listeleri yenile
function refreshMaterialLists() {
    loadMaterialLists();
    showToast("Malzeme listeleri yenilendi", "success");
}

// Tab değiştir
function switchTab(tabId) {
    // Tüm tabları deaktif et
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Seçilen tabı aktif et
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    
    // Tüm içerikleri gizle
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Seçilen içeriği göster
    document.getElementById(`${tabId}-content`).classList.add('active');
}

// Örnek malzeme listeleri
function getExampleMaterialLists() {
    return [
        {
            id: 'list-1',
            listCode: 'ML-2405-001',
            listType: 'primer',
            cellType: 'RM 36 LB',
            technicalDetails: '36kV 630A 16kA Yük Ayırıcılı Giriş Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 45,
            createdAt: new Date('2024-05-01'),
            updatedAt: new Date('2024-05-01')
        },
        {
            id: 'list-2',
            listCode: 'ML-2405-002',
            listType: 'sekonder',
            cellType: 'RM 36 LB',
            technicalDetails: '36kV 630A 16kA Yük Ayırıcılı Giriş Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 78,
            createdAt: new Date('2024-05-01'),
            updatedAt: new Date('2024-05-01')
        },
        {
            id: 'list-3',
            listCode: 'ML-2405-003',
            listType: 'primer',
            cellType: 'RM 36 CB',
            technicalDetails: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 52,
            createdAt: new Date('2024-05-02'),
            updatedAt: new Date('2024-05-02')
        },
        {
            id: 'list-4',
            listCode: 'ML-2405-004',
            listType: 'sekonder',
            cellType: 'RM 36 CB',
            technicalDetails: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 85,
            createdAt: new Date('2024-05-02'),
            updatedAt: new Date('2024-05-02')
        },
        {
            id: 'list-5',
            listCode: 'ML-2405-005',
            listType: 'primer',
            cellType: 'RM 36 FL',
            technicalDetails: '36kV 200A 16kA Sigortalı Yük Ayırıcılı TR.Koruma Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 48,
            createdAt: new Date('2024-05-03'),
            updatedAt: new Date('2024-05-03')
        },
        {
            id: 'list-6',
            listCode: 'ML-2405-006',
            listType: 'sekonder',
            cellType: 'RM 36 FL',
            technicalDetails: '36kV 200A 16kA Sigortalı Yük Ayırıcılı TR.Koruma Hücresi',
            description: 'Standart yapılandırma',
            materialsCount: 72,
            createdAt: new Date('2024-05-03'),
            updatedAt: new Date('2024-05-03')
        }
    ];
}

// Örnek malzemeler
function getExampleMaterials(listId) {
    // listId parametresine göre farklı malzeme setleri döndürebiliriz
    let baseMaterials = [];
    
    // Malzemelerin tipi ve sayısı liste ID'sine göre değişecek
    switch (listId) {
        case 'list-1': // RM 36 LB - Primer
            baseMaterials = [
                { id: 'mat-1', materialCode: 'MLZ-P001', caniasCode: '105121%', materialName: 'Ana Hücre Gövdesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-2', materialCode: 'MLZ-P002', caniasCode: '105122%', materialName: 'Yük Ayırıcı Mekanizması', quantity: 1, unit: 'Adet' },
                { id: 'mat-3', materialCode: 'MLZ-P003', caniasCode: '105123%', materialName: 'Topraklama Anahtarı', quantity: 1, unit: 'Adet' },
                { id: 'mat-4', materialCode: 'MLZ-P004', caniasCode: '105124%', materialName: 'Bağlantı Barası', quantity: 3, unit: 'Adet' },
                { id: 'mat-5', materialCode: 'MLZ-P005', caniasCode: '105125%', materialName: 'Ana İzolatör', quantity: 6, unit: 'Adet' },
                { id: 'mat-6', materialCode: 'MLZ-P006', caniasCode: '105126%', materialName: 'Ayırıcı Kontakları', quantity: 3, unit: 'Takım' },
                { id: 'mat-7', materialCode: 'MLZ-P007', caniasCode: '105127%', materialName: 'Kapasitif Gerilim Bölücü', quantity: 3, unit: 'Adet' }
            ];
            break;
        case 'list-2': // RM 36 LB - Sekonder
            baseMaterials = [
                { id: 'mat-10', materialCode: 'MLZ-S001', caniasCode: '109367%', materialName: 'Kablaj Seti', quantity: 1, unit: 'Takım' },
                { id: 'mat-11', materialCode: 'MLZ-S002', caniasCode: '109368%', materialName: 'Gerilim Göstergesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-12', materialCode: 'MLZ-S003', caniasCode: '109369%', materialName: 'UKD Set', quantity: 1, unit: 'Takım' },
                { id: 'mat-13', materialCode: 'MLZ-S004', caniasCode: '109370%', materialName: 'Motor Kontrol Rölesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-14', materialCode: 'MLZ-S005', caniasCode: '109371%', materialName: 'Terminal Bloğu', quantity: 5, unit: 'Adet' },
                { id: 'mat-15', materialCode: 'MLZ-S006', caniasCode: '109372%', materialName: 'İkincil Kablo', quantity: 25, unit: 'Metre' },
                { id: 'mat-16', materialCode: 'MLZ-S007', caniasCode: '109373%', materialName: 'Kontrol Butonu', quantity: 3, unit: 'Adet' }
            ];
            break;
        case 'list-3': // RM 36 CB - Primer
            baseMaterials = [
                { id: 'mat-20', materialCode: 'MLZ-P010', caniasCode: '105091%', materialName: 'Ana Hücre Gövdesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-21', materialCode: 'MLZ-P011', caniasCode: '105092%', materialName: 'Kesici Mekanizması', quantity: 1, unit: 'Adet' },
                { id: 'mat-22', materialCode: 'MLZ-P012', caniasCode: '105093%', materialName: 'Akım Trafosu', quantity: 3, unit: 'Adet' },
                { id: 'mat-23', materialCode: 'MLZ-P013', caniasCode: '105094%', materialName: 'Bara Sistemi', quantity: 1, unit: 'Takım' },
                { id: 'mat-24', materialCode: 'MLZ-P014', caniasCode: '105095%', materialName: 'Ana İzolatör', quantity: 6, unit: 'Adet' },
                { id: 'mat-25', materialCode: 'MLZ-P015', caniasCode: '105096%', materialName: 'Kesici Kontakları', quantity: 1, unit: 'Takım' },
                { id: 'mat-26', materialCode: 'MLZ-P016', caniasCode: '105097%', materialName: 'Kablo Bağlantısı', quantity: 3, unit: 'Adet' }
            ];
            break;
        case 'list-4': // RM 36 CB - Sekonder
            baseMaterials = [
                { id: 'mat-30', materialCode: 'MLZ-S010', caniasCode: '137998%', materialName: 'Koruma Rölesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-31', materialCode: 'MLZ-S011', caniasCode: '137999%', materialName: 'Kablaj Seti', quantity: 1, unit: 'Takım' },
                { id: 'mat-32', materialCode: 'MLZ-S012', caniasCode: '138000%', materialName: 'UKD Set', quantity: 1, unit: 'Takım' },
                { id: 'mat-33', materialCode: 'MLZ-S013', caniasCode: '138001%', materialName: 'Kesici Kontrol Kartı', quantity: 1, unit: 'Adet' },
                { id: 'mat-34', materialCode: 'MLZ-S014', caniasCode: '138002%', materialName: 'Terminal Bloğu', quantity: 8, unit: 'Adet' },
                { id: 'mat-35', materialCode: 'MLZ-S015', caniasCode: '138003%', materialName: 'İkincil Kablo', quantity: 40, unit: 'Metre' },
                { id: 'mat-36', materialCode: 'MLZ-S016', caniasCode: '138004%', materialName: 'Kontrol Butonu', quantity: 5, unit: 'Adet' }
            ];
            break;
        case 'list-5': // RM 36 FL - Primer
            baseMaterials = [
                { id: 'mat-40', materialCode: 'MLZ-P020', caniasCode: '105112%', materialName: 'Ana Hücre Gövdesi', quantity: 1, unit: 'Adet' },
                { id: 'mat-41', materialCode: 'MLZ-P021', caniasCode: '105113%', materialName: 'Sigortalı Ayırıcı', quantity: 1, unit: 'Adet' },
                { id: 'mat-42', materialCode: 'MLZ-P022', caniasCode: '105114%', materialName: 'YG Sigorta', quantity: 3, unit: 'Adet' },
                { id: 'mat-43', materialCode: 'MLZ-P023', caniasCode: '105115%', materialName: 'Bara Sistemi', quantity: 1, unit: 'Takım' },
                { id: 'mat-44', materialCode: 'MLZ-P024', caniasCode: '105115%', materialName: 'Bara Sistemi', quantity: 1, unit: 'Takım' },
                { id: 'mat-35', materialCode: 'MLZ-S015', caniasCode: '138003%', materialName: 'İkincil Kablo', quantity: 40, unit: 'Metre' },
                { id: 'mat-36', materialCode: 'MLZ-S016', caniasCode: '138004%', materialName: 'Kontrol Butonu', quantity: 5, unit: 'Adet' }
    ];
}