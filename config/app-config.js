const AppConfig = {
    apiEndpoints: {
        production: '/api/production',
        purchasing: '/api/purchasing',
        orders: '/api/orders',
        inventory: '/api/inventory',
        ai: '/api/ai',
        erp: '/api/erp'
    },
    firebase: {
        // Firebase config
    },
    modules: {
        dashboard: true,
        production: true,
        purchasing: true,
        inventory: true,
        ai: {
            enabled: true,
            modelType: 'hybrid', // hybrid, openai, deepseek, tensorflow
            chatbot: true,
            analytics: true,
            prediction: true,
            materialPrediction: true,
            technicalAssistant: true
        }
    },
    ai: {
        // Bu API anahtarlarını üretim ortamında asla doğrudan kodda tutmayın
        // Güvenlik için environment variables veya backend tarafında saklayın
        // Bu sadece demo/geliştirme amaçlıdır
        deepseek: {
            apiKey: "sk-42d0185c484b4bf2907392864f4ae76d",
            model: "deepseek-r1-llm",
            maxTokens: 2000,
            temperature: 0.7
        },
        // OpenAI entegrasyonu (isteğe bağlı)
        openai: {
            apiKey: "", // Sadece geliştirme/demo için
            model: "gpt-3.5-turbo", 
            systemMessage: "Sen bir üretim takip ve planlama asistanısın. Orta gerilim anahtarlama ekipmanları üretimi konusunda uzmanlaşmışsın."
        },
        // Makine Öğrenmesi entegrasyonu
        machineLearning: {
            enabled: true,
            predictionModel: "regression", // regression, classification, timeseries
            trainingInterval: "weekly", // Modellerin yeniden eğitilme sıklığı
            minimumDataPoints: 100, // Eğitim için gereken minimum veri noktası sayısı
            features: [
                "hucre_tipi", "voltaj", "akim", "role_tipi", "uretim_suresi", 
                "malzeme_tedarik_suresi", "montaj_suresi", "test_suresi"
            ]
        }
    },
    erpIntegration: {
        type: "canias",
        enabled: true,
        apiEndpoint: "/api/erp/canias",
        syncInterval: 60, // dakika
        tables: {
            stock: "B01_STOK",
            orders: "SIPARIS",
            materials: "MALZEME",
            customers: "MUSTERI"
        }
    },
    notifications: {
        email: true,
        push: true,
        sms: false,
        delayWarning: {
            yellow: 1, // 1 gün gecikme uyarısı
            red: 3 // 3 gün gecikme kritik uyarı
        },
        materialShortage: {
            enabled: true,
            threshold: 5 // Eşik değerin altındaki malzemeler için uyarı
        }
    },
    security: {
        tokenExpiration: 24, // saat
        minimumPasswordLength: 8,
        requireMFA: false // Çok faktörlü kimlik doğrulama
    },
    ui: {
        theme: "light", // light, dark, auto
        dashboard: {
            refreshInterval: 5, // dakika
            charts: {
                enabled: true,
                colorPalette: ["#3498db", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6"]
            }
        }
    }
};

export default AppConfig;
