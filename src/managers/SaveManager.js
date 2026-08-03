/**
 * Класс SaveManager
 * Обеспечивает надежное сохранение, загрузку и синхронизацию данных.
 * Поддерживает IndexedDB, LocalStorage и Cloud.
 */
class SaveManager {
    constructor() {
        this.saveKey = GameConfig.SAVE.LOCAL_STORAGE_KEY;
        this.dbName = 'BrainrotFactoryDB';
        this.storeName = 'saves';
        
        // Реестр модулей, которые требуют сохранения
        this.subsystems = new Map();
        
        this.lastSaveTime = Date.now();
        this.autoSaveInterval = GameConfig.SAVE.SAVE_INTERVAL_MS;
        
        // Привязываем контекст
        this.autoSave = this.autoSave.bind(this);
        
        // Запускаем автосохранение
        setInterval(this.autoSave, this.autoSaveInterval);
        
        // Сохранение при закрытии вкладки
        window.addEventListener('beforeunload', () => this.forceSave());
    }

    /**
     * Регистрация подсистемы для участия в цикле сохранения
     * @param {string} key Уникальный ключ подсистемы (например, 'economy')
     * @param {Object} instance Экземпляр менеджера (должен иметь getSaveData() и loadSaveData(data))
     */
    registerSubsystem(key, instance) {
        if (typeof instance.getSaveData !== 'function' || typeof instance.loadSaveData !== 'function') {
            Logger.error('SaveManager', `Модуль ${key} не реализует интерфейс сохранения!`);
            return;
        }
        this.subsystems.set(key, instance);
    }

    /**
     * Инициализирует IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onerror = (event) => {
                Logger.warn('SaveManager', 'Ошибка IndexedDB, будет использован LocalStorage');
                reject(event);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    /**
     * Сбор данных со всех подсистем
     */
    collectSaveData() {
        const fullSaveData = {
            version: '1.0.0',
            timestamp: Date.now()
        };
        
        for (const [key, system] of this.subsystems.entries()) {
            try {
                fullSaveData[key] = system.getSaveData();
            } catch (error) {
                Logger.error('SaveManager', `Ошибка при сборе данных модуля ${key}`, error);
            }
        }
        
        return fullSaveData;
    }

    /**
     * Распределение загруженных данных по подсистемам
     * @param {Object} data Полный объект сохранения
     */
    distributeSaveData(data) {
        if (!data) return;
        
        for (const [key, system] of this.subsystems.entries()) {
            try {
                if (data[key] !== undefined) {
                    system.loadSaveData(data[key]);
                }
            } catch (error) {
                Logger.error('SaveManager', `Ошибка при загрузке данных модуля ${key}`, error);
            }
        }
    }

    /**
     * Основной метод загрузки. Пытается загрузить из облака, затем из IDB, затем из LocalStorage.
     */
    async loadGame() {
        Logger.info('SaveManager', 'Начало загрузки сохранений...');
        let saveData = null;

        // 1. Попытка загрузить из облака Яндекса
        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED) {
            saveData = await yandexSDK.loadCloudData();
        }

        // 2. Если облако пустое или недоступно, ищем локально в IndexedDB
        if (!saveData) {
            try {
                const db = await this.initIndexedDB();
                saveData = await new Promise((resolve) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.get(this.saveKey);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                });
            } catch (error) {
                Logger.info('SaveManager', 'Переход на fallback LocalStorage для загрузки');
            }
        }

        // 3. Fallback на LocalStorage
        if (!saveData) {
            const localData = localStorage.getItem(this.saveKey);
            if (localData) {
                try {
                    saveData = JSON.parse(localData);
                } catch (e) {
                    Logger.error('SaveManager', 'Сохранение в LocalStorage повреждено!');
                }
            }
        }

        // Распределяем данные
        if (saveData) {
            Logger.info('SaveManager', 'Сохранение успешно найдено и применено');
            this.distributeSaveData(saveData);
        } else {
            Logger.info('SaveManager', 'Сохранений не найдено. Начат новый прогресс.');
        }
    }

    /**
     * Сохранение игры
     */
    async saveGame() {
        const data = this.collectSaveData();
        
        // 1. Сохранение в LocalStorage (Синхронно, максимально быстро)
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(data));
        } catch (e) {
            Logger.warn('SaveManager', 'Не удалось сохранить в LocalStorage', e);
        }

        // 2. Сохранение в IndexedDB (Асинхронно)
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.put(data, this.saveKey);
        } catch (e) {
            // Игнорируем ошибки IDB, так как LocalStorage уже сохранил
        }

        // 3. Сохранение в облако (Если доступно)
        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED) {
            await yandexSDK.saveCloudData(data);
        }

        this.lastSaveTime = Date.now();
        Logger.debug('SaveManager', 'Игра успешно сохранена');
    }

    /**
     * Цикл автосохранения
     */
    autoSave() {
        // Не сохраняем, если игра не загружена или находится в фоне слишком долго
        this.saveGame();
    }

    /**
     * Экстренное сохранение при закрытии
     */
    forceSave() {
        const data = this.collectSaveData();
        localStorage.setItem(this.saveKey, JSON.stringify(data));
        // Облако не вызываем, так как вкладка закрывается, асинхронные запросы могут быть отменены браузером
    }

    /**
     * Полный сброс прогресса (Soft Reset / Hard Reset)
     */
    async wipeData() {
        localStorage.removeItem(this.saveKey);
        
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.delete(this.saveKey);
        } catch (e) {}

        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED) {
            await yandexSDK.saveCloudData({}); // Перезаписываем пустым объектом
        }
        
        Logger.info('SaveManager', 'Все сохранения удалены');
        window.location.reload(); // Перезапуск игры
    }
}