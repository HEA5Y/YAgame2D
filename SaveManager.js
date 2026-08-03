/**
 * Класс SaveManager - Обновлённый
 * Интеграция с SaveVersionManager для миграции сохранений
 * Валидация, backup и защита от повреждённых данных
 */
class SaveManager {
    constructor() {
        this.saveKey = GameConfig.SAVE.LOCAL_STORAGE_KEY;
        this.dbName = 'BrainrotFactoryDB';
        this.storeName = 'saves';
        this.subsystems = new Map();
        this.lastSaveTime = Date.now();
        this.autoSaveInterval = GameConfig.SAVE.SAVE_INTERVAL_MS;
        this.autoSave = this.autoSave.bind(this);
        
        // Инициализация менеджера версий
        this.versionManager = new SaveVersionManager();
        
        setInterval(this.autoSave, this.autoSaveInterval);
        window.addEventListener('beforeunload', () => this.forceSave());
    }

    registerSubsystem(key, instance) {
        if (typeof instance.getSaveData !== 'function' || typeof instance.loadSaveData !== 'function') {
            Logger.error('SaveManager', `Модуль ${key} не реализует интерфейс сохранения!`);
            return;
        }
        this.subsystems.set(key, instance);
    }

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = (event) => {
                Logger.warn('SaveManager', 'Ошибка IndexedDB, будет использован LocalStorage');
                reject(event);
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    collectSaveData() {
        const fullSaveData = {
            version: GameConfig.SAVE_VERSION, // ← исправлено: используем SAVE_VERSION
            versionNumber: this.versionManager.getCurrentVersion(),
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

    distributeSaveData(data) {
        if (!data) return;
        
        // Валидация данных через SaveVersionManager
        if (!this.versionManager.validateSaveData(data)) {
            Logger.warn('SaveManager', 'Сохранение не прошло валидацию, используются дефолтные значения');
            data = this.versionManager.createDefaultSave();
        }
        
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

    async loadGame() {
        Logger.info('SaveManager', 'Начало загрузки сохранений...');
        let saveData = null;
        let backupUsed = false;

        // 1. Попытка загрузить из облака Яндекса
        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED && window.yandexSDK) {
            try {
                saveData = await window.yandexSDK.loadCloudData();
            } catch (error) {
                Logger.warn('SaveManager', 'Ошибка загрузки из облака, переход к локальному хранилищу', error);
            }
        }

        // 2. Если облако пустое, ищем в IndexedDB
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
                Logger.info('SaveManager', 'Переход на fallback LocalStorage');
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
                    backupUsed = true;
                }
            }
        }
        
        // 4. Если данные повреждены, пробуем загрузить backup
        if (backupUsed || !saveData) {
            const backupKey = this.saveKey + '_backup';
            const backupData = localStorage.getItem(backupKey);
            if (backupData) {
                try {
                    saveData = JSON.parse(backupData);
                    Logger.info('SaveManager', 'Загружено резервное сохранение');
                } catch (e) {
                    Logger.warn('SaveManager', 'Резервное сохранение также повреждено');
                }
            }
        }

        // Распределяем данные
        if (saveData) {
            Logger.info('SaveManager', 'Сохранение успешно найдено и применено');
            this.distributeSaveData(saveData);
            return true;
        } else {
            Logger.info('SaveManager', 'Сохранений не найдено. Начат новый прогресс.');
            return false;
        }
    }

    async saveGame() {
        const data = this.collectSaveData();
        
        // Создаём backup перед сохранением
        const backupKey = this.saveKey + '_backup';
        const existingData = localStorage.getItem(this.saveKey);
        if (existingData) {
            try {
                localStorage.setItem(backupKey, existingData);
            } catch (e) {
                Logger.warn('SaveManager', 'Не удалось создать backup');
            }
        }
        
        // 1. Сохранение в LocalStorage
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(data));
        } catch (e) {
            Logger.warn('SaveManager', 'Не удалось сохранить в LocalStorage', e);
        }

        // 2. Сохранение в IndexedDB
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.put(data, this.saveKey);
        } catch (e) {
            // Игнорируем ошибки IDB
        }

        // 3. Сохранение в облако
        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED && window.yandexSDK) {
            try {
                await window.yandexSDK.saveCloudData(data);
            } catch (error) {
                Logger.warn('SaveManager', 'Ошибка сохранения в облако', error);
            }
        }

        this.lastSaveTime = Date.now();
        Logger.debug('SaveManager', 'Игра успешно сохранена');
    }

    autoSave() {
        this.saveGame();
    }

    forceSave() {
        const data = this.collectSaveData();
        localStorage.setItem(this.saveKey, JSON.stringify(data));
    }

    async wipeData() {
        localStorage.removeItem(this.saveKey);
        localStorage.removeItem(this.saveKey + '_backup');
        
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.delete(this.saveKey);
        } catch (e) {}

        if (GameConfig.SAVE.CLOUD_SAVE_ENABLED && window.yandexSDK) {
            try {
                await window.yandexSDK.saveCloudData({});
            } catch (error) {
                Logger.warn('SaveManager', 'Ошибка очистки облачных данных', error);
            }
        }
        
        Logger.info('SaveManager', 'Все сохранения удалены');
        window.location.reload();
    }
    
    /**
     * Экспорт сохранения в файл
     */
    exportSave() {
        const data = this.collectSaveData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainrot_factory_save_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Logger.info('SaveManager', 'Сохранение экспортировано');
    }
    
    /**
     * Импорт сохранения из файла
     */
    importSave(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (this.versionManager.validateSaveData(data)) {
                    localStorage.setItem(this.saveKey, JSON.stringify(data));
                    Logger.info('SaveManager', 'Сохранение импортировано');
                    window.location.reload();
                } else {
                    Logger.error('SaveManager', 'Невалидное сохранение');
                }
            } catch (error) {
                Logger.error('SaveManager', 'Ошибка импорта сохранения', error);
            }
        };
        reader.readAsText(file);
    }
}