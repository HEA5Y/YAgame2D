/**
 * SaveVersionManager - Управление версиями сохранений и миграция
 * Решает проблемы #40, #41, #42
 */
class SaveVersionManager {
    constructor() {
        this.currentVersion = GameConfig.SAVE_VERSION;
        this.migrations = new Map();
        this.registerMigrations();
    }

    registerMigrations() {
        // Регистрируем функции миграции для каждой версии
        this.migrations.set('1.0.0', (data) => this.migrateTo1_0_0(data));
        // Будущие миграции:
        // this.migrations.set('1.1.0', (data) => this.migrateTo1_1_0(data));
    }

    migrateTo1_0_0(data) {
        // Базовая миграция для версии 1.0.0
        if (!data.version) {
            data.version = '1.0.0';
        }
        
        // Добавляем недостающие поля по умолчанию
        if (!data.collection) {
            data.collection = {
                creatures: [],
                unlockedCount: 0,
                totalCount: 120
            };
        }
        
        if (!data.battlePass) {
            data.battlePass = {
                level: 1,
                xp: 0,
                isPremium: false,
                seasonStart: Date.now()
            };
        }
        
        if (!data.dailyRewards) {
            data.dailyRewards = {
                lastClaimDate: null,
                streak: 0,
                claimedDays: []
            };
        }
        
        if (!data.chests) {
            data.chests = {
                available: [],
                opening: [],
                lastFreeChest: null
            };
        }
        
        if (!data.worlds) {
            data.worlds = {
                current: 0,
                unlocked: [0]
            };
        }
        
        if (!data.pets) {
            data.pets = {
                owned: [],
                active: null
            };
        }
        
        if (!data.combo) {
            data.combo = {
                stack: 0,
                lastClickTime: 0
            };
        }
        
        if (!data.stats) {
            data.stats = {
                totalPlayTime: 0,
                totalClicks: 0,
                totalPrestige: 0,
                totalAdsWatched: 0,
                sessionCount: 0
            };
        }
        
        return data;
    }

    validateSaveData(data) {
        if (!data || typeof data !== 'object') {
            Logger.error('Invalid save data: not an object');
            return null;
        }
        
        // Проверяем обязательные поля
        const requiredFields = ['version', 'resources', 'factories'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                Logger.warn(`Missing field ${field} in save data`);
            }
        }
        
        return data;
    }

    async loadAndMigrate(savedData) {
        try {
            let data = savedData;
            
            // Парсим если строка
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            
            // Валидация
            data = this.validateSaveData(data);
            if (!data) {
                return this.createDefaultSave();
            }
            
            // Определяем версию сохранения
            const saveVersion = data.version || '0.0.0';
            
            // Если версия старее текущей - мигрируем
            if (this.compareVersions(saveVersion, this.currentVersion) < 0) {
                Logger.info(`Migrating save from ${saveVersion} to ${this.currentVersion}`);
                
                // Получаем все версии между текущей и целевой
                const versions = Array.from(this.migrations.keys()).sort(this.compareVersions);
                
                for (const version of versions) {
                    if (this.compareVersions(version, saveVersion) > 0 && 
                        this.compareVersions(version, this.currentVersion) <= 0) {
                        const migrationFn = this.migrations.get(version);
                        if (migrationFn) {
                            data = migrationFn(data);
                            data.version = version;
                            Logger.debug(`Migrated to version ${version}`);
                        }
                    }
                }
            }
            
            // Финальная валидация
            data = this.validateSaveData(data);
            if (!data) {
                throw new Error('Save data validation failed after migration');
            }
            
            Logger.info(`Save loaded successfully (version ${data.version})`);
            return data;
            
        } catch (error) {
            Logger.error('Failed to load and migrate save:', error);
            // Возвращаем дефолтное сохранение при ошибке
            return this.createDefaultSave();
        }
    }

    createDefaultSave() {
        Logger.info('Creating default save data');
        const defaultData = {
            version: this.currentVersion,
            resources: {
                coins: 0,
                gems: 0,
                brainCells: 0
            },
            factories: [],
            collection: {
                creatures: [],
                unlockedCount: 0,
                totalCount: 120
            },
            battlePass: {
                level: 1,
                xp: 0,
                isPremium: false,
                seasonStart: Date.now()
            },
            dailyRewards: {
                lastClaimDate: null,
                streak: 0,
                claimedDays: []
            },
            chests: {
                available: [],
                opening: [],
                lastFreeChest: null
            },
            worlds: {
                current: 0,
                unlocked: [0]
            },
            pets: {
                owned: [],
                active: null
            },
            combo: {
                stack: 0,
                lastClickTime: 0
            },
            stats: {
                totalPlayTime: 0,
                totalClicks: 0,
                totalPrestige: 0,
                totalAdsWatched: 0,
                sessionCount: 0
            },
            lastSaveTime: Date.now(),
            settings: {
                musicVolume: 0.3,
                sfxVolume: 0.7,
                vibrations: true
            }
        };
        
        return defaultData;
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 !== p2) {
                return p1 - p2;
            }
        }
        
        return 0;
    }

    getCurrentVersion() {
        return this.currentVersion;
    }
}

// Экспортируем глобально
window.SaveVersionManager = new SaveVersionManager();
