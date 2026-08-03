/**
 * CollectionManager - Управление коллекцией существ, гачей и редкостями
 */
class CollectionManager {
    constructor() {
        this.collection = {}; // { id: { count, level, firstObtainTime } }
        this.gachaRates = {
            common: 0.50,    // 50%
            rare: 0.30,      // 30%
            epic: 0.15,      // 15%
            legendary: 0.04, // 4%
            mythic: 0.009,   // 0.9%
            divine: 0.001    // 0.1%
        };
        this.rarityColors = {
            common: '#b0b0b0',
            rare: '#4ade80',
            epic: '#a855f7',
            legendary: '#fbbf24',
            mythic: '#ec4899',
            divine: '#f43f5e'
        };
        this.rarityNames = {
            common: 'Обычный',
            rare: 'Редкий',
            epic: 'Эпический',
            legendary: 'Легендарный',
            mythic: 'Мифический',
            divine: 'Божественный'
        };
        this.listeners = [];
        
        // Получаем economy из реестра для работы с валютой
        this.economyManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
    }

    init() {
        // Загрузка коллекции из сохранения
        this.loadCollection();
        
        gameEventBus.on('gacha_pull', this.handleGachaPull.bind(this));
        gameEventBus.on('collection_upgrade', this.upgradeCreature.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.collection));
    }

    // Логика открытия контейнера (Гача)
    pullGacha(type = 'standard') {
        const rand = Math.random();
        let cumulative = 0;
        let rarity = 'common';

        for (const [key, rate] of Object.entries(this.gachaRates)) {
            cumulative += rate;
            if (rand <= cumulative) {
                rarity = key;
                break;
            }
        }

        // Генерация ID существа на основе редкости
        const creatureId = this.generateCreatureId(rarity);
        
        const isNew = !this.collection[creatureId];
        
        if (isNew) {
            this.collection[creatureId] = {
                count: 1,
                level: 1,
                firstObtainTime: Date.now(),
                rarity: rarity
            };
            gameEventBus.emit('new_creature_unlocked', { id: creatureId, rarity });
        } else {
            this.collection[creatureId].count++;
            // Шанс получить дубликат для улучшения (упрощено)
            if (Math.random() < 0.1) {
                this.collection[creatureId].level++;
                gameEventBus.emit('creature_upgraded', { id: creatureId });
            }
        }

        this.saveCollection();
        gameEventBus.emit('gacha_result', { id: creatureId, rarity, isNew });
        this.notifyListeners();
        
        return { id: creatureId, rarity, isNew };
    }

    /**
     * Генерация ID существа на основе редкости
     * (замена несуществующего EconomyData.getCreaturePool)
     */
    generateCreatureId(rarity) {
        const prefixes = {
            common: ['slime', 'rat', 'goblin', 'bug'],
            rare: ['wolf', 'skeleton', 'zombie', 'imp'],
            epic: ['vampire', 'witch', 'golem', 'demon'],
            legendary: ['dragon', 'phoenix', 'titan', 'leviathan'],
            mythic: ['cthulhu', 'behemoth', 'archangel'],
            divine: ['god', 'cosmic_entity', 'universe']
        };
        const pool = prefixes[rarity] || ['creature'];
        const prefix = pool[Math.floor(Math.random() * pool.length)];
        return `${prefix}_${rarity}_${Math.floor(Math.random() * 1000)}`;
    }

    upgradeCreature(creatureId) {
        if (!this.collection[creatureId]) return;
        
        // Используем EconomyManager из реестра вместо ResourceManager
        const cost = this.getUpgradeCost(creatureId);
        if (this.economyManager && this.economyManager.hasEnough(GameConfig.CURRENCY.GEMS, cost)) {
            this.economyManager.spendCurrency(GameConfig.CURRENCY.GEMS, cost, 'creature_upgrade');
            this.collection[creatureId].level++;
            this.saveCollection();
            gameEventBus.emit('collection_updated');
            this.notifyListeners();
        }
    }

    getUpgradeCost(creatureId) {
        const level = this.collection[creatureId].level;
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    getCollectionStats() {
        const total = Object.keys(this.collection).length;
        const byRarity = {};
        for (const r in this.rarityNames) byRarity[r] = 0;
        
        Object.values(this.collection).forEach(c => {
            byRarity[c.rarity]++;
        });

        return { total, byRarity };
    }

    getBonusMultiplier() {
        // Бонус за коллекцию: +1% за каждое уникальное существо
        const count = Object.keys(this.collection).length;
        return 1 + (count * 0.01);
    }

    // Загрузка/сохранение через localStorage вместо SaveManager
    loadCollection() {
        try {
            const saved = localStorage.getItem('bf_collection');
            if (saved) {
                this.collection = JSON.parse(saved);
            }
        } catch (e) {
            Logger.warn('CollectionManager', 'Не удалось загрузить коллекцию', e);
        }
    }

    saveCollection() {
        try {
            localStorage.setItem('bf_collection', JSON.stringify(this.collection));
        } catch (e) {
            Logger.warn('CollectionManager', 'Не удалось сохранить коллекцию', e);
        }
    }

    handleGachaPull(data) {
        if (data && data.guaranteedRarity) {
            // Гарантированная редкость
            this.pullGuaranteed(data.guaranteedRarity);
        } else {
            this.pullGacha();
        }
    }

    pullGuaranteed(rarity) {
        const creatureId = this.generateCreatureId(rarity);
        const isNew = !this.collection[creatureId];
        
        if (isNew) {
            this.collection[creatureId] = {
                count: 1,
                level: 1,
                firstObtainTime: Date.now(),
                rarity: rarity
            };
            gameEventBus.emit('new_creature_unlocked', { id: creatureId, rarity });
        } else {
            this.collection[creatureId].count++;
        }

        this.saveCollection();
        gameEventBus.emit('gacha_result', { id: creatureId, rarity, isNew });
        this.notifyListeners();
        return { id: creatureId, rarity, isNew };
    }
}