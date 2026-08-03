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
    }

    init() {
        // Загрузка коллекции из сохранения
        const saved = SaveManager.load('collection');
        if (saved) {
            this.collection = saved;
        }
        EventBus.on('gacha_pull', this.handleGachaPull.bind(this));
        EventBus.on('collection_upgrade', this.upgradeCreature.bind(this));
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

        // Выбор конкретного существа из пула редкости
        const pool = EconomyData.getCreaturePool(rarity);
        const creatureId = pool[Math.floor(Math.random() * pool.length)];
        
        const isNew = !this.collection[creatureId];
        
        if (isNew) {
            this.collection[creatureId] = {
                count: 1,
                level: 1,
                firstObtainTime: Date.now(),
                rarity: rarity
            };
            EventBus.emit('new_creature_unlocked', { id: creatureId, rarity });
        } else {
            this.collection[creatureId].count++;
            // Шанс получить дубликат для улучшения (упрощено)
            if (Math.random() < 0.1) {
                this.collection[creatureId].level++;
                EventBus.emit('creature_upgraded', { id: creatureId });
            }
        }

        SaveManager.save('collection', this.collection);
        EventBus.emit('gacha_result', { id: creatureId, rarity, isNew });
        this.notifyListeners();
        
        return { id: creatureId, rarity, isNew };
    }

    upgradeCreature(creatureId) {
        if (!this.collection[creatureId]) return;
        const cost = this.getUpgradeCost(creatureId);
        if (ResourceManager.has('gems', cost)) {
            ResourceManager.spend('gems', cost);
            this.collection[creatureId].level++;
            SaveManager.save('collection', this.collection);
            EventBus.emit('collection_updated');
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
}
