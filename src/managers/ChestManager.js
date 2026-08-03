/**
 * ChestManager - Система сундуков и наград
 */
class ChestManager {
    constructor() {
        this.chestTypes = {
            common: { 
                color: '#9ca3af', 
                name: 'Обычный', 
                openTime: 0, 
                rewards: { coins: [50, 200], gems: [0, 5] } 
            },
            rare: { 
                color: '#4ade80', 
                name: 'Редкий', 
                openTime: 30, 
                rewards: { coins: [200, 500], gems: [5, 15] } 
            },
            epic: { 
                color: '#a855f7', 
                name: 'Эпический', 
                openTime: 60, 
                rewards: { coins: [500, 1500], gems: [15, 40] } 
            },
            legendary: { 
                color: '#fbbf24', 
                name: 'Легендарный', 
                openTime: 120, 
                rewards: { coins: [1500, 5000], gems: [40, 100], creatureChance: 0.3 } 
            },
            mythic: { 
                color: '#ec4899', 
                name: 'Мифический', 
                openTime: 180, 
                rewards: { coins: [5000, 15000], gems: [100, 250], creatureChance: 0.6 } 
            },
            divine: { 
                color: '#f43f5e', 
                name: 'Божественный', 
                openTime: 240, 
                rewards: { coins: [15000, 50000], gems: [250, 500], creatureChance: 0.9 } 
            }
        };

        this.activeChests = []; // { type, unlockTime, claimed }
        this.chestCooldown = 0; // Время до следующего бесплатного сундука
        this.freeChestInterval = 10 * 60 * 1000; // 10 минут
        
        this.listeners = [];
    }

    init() {
        const saved = SaveManager.load('chests');
        if (saved) {
            this.activeChests = saved.activeChests || [];
            this.chestCooldown = saved.chestCooldown || 0;
        }

        EventBus.on('open_chest', this.openChest.bind(this));
        EventBus.on('claim_chest', this.claimChest.bind(this));
        EventBus.on('instant_open', this.instantOpenChest.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    openChest({ rarity, free = false }) {
        const chestType = this.chestTypes[rarity];
        if (!chestType) return null;

        // Проверка лимитов для бесплатных сундуков
        if (free && this.chestCooldown > 0) {
            Logger.warn('Free chest on cooldown!');
            return null;
        }

        const chest = {
            id: Date.now(),
            type: rarity,
            unlockTime: Date.now() + (chestType.openTime * 1000),
            claimed: false,
            isFree: free
        };

        this.activeChests.push(chest);

        if (free) {
            this.chestCooldown = this.freeChestInterval;
        }

        SaveManager.save('chests', {
            activeChests: this.activeChests,
            chestCooldown: this.chestCooldown
        });

        EventBus.emit('chest_opened', { chest });
        this.notifyListeners();
        return chest;
    }

    claimChest(chestId) {
        const chestIndex = this.activeChests.findIndex(c => c.id === chestId);
        if (chestIndex === -1) return null;

        const chest = this.activeChests[chestIndex];
        const chestType = this.chestTypes[chest.type];

        if (Date.now() < chest.unlockTime) {
            Logger.warn('Chest not ready yet!');
            return null;
        }

        if (chest.claimed) {
            Logger.warn('Chest already claimed!');
            return null;
        }

        // Генерация наград
        const rewards = this.generateRewards(chest.type);
        
        // Выдача наград
        if (rewards.coins) ResourceManager.add('coins', rewards.coins);
        if (rewards.gems) ResourceManager.add('gems', rewards.gems);
        if (rewards.creature) {
            EventBus.emit('gacha_pull', { guaranteedRarity: rewards.creature });
        }

        chest.claimed = true;
        this.activeChests.splice(chestIndex, 1); // Удаление после получения

        SaveManager.save('chests', {
            activeChests: this.activeChests,
            chestCooldown: this.chestCooldown
        });

        EventBus.emit('chest_claimed', { chest, rewards });
        this.notifyListeners();
        return rewards;
    }

    instantOpenChest(chestId) {
        const chest = this.activeChests.find(c => c.id === chestId);
        if (!chest) return false;

        const chestType = this.chestTypes[chest.type];
        const timeRemaining = chest.unlockTime - Date.now();

        if (timeRemaining <= 0) return false;

        // Стоимость мгновенного открытия (1 гем за 30 секунд)
        const cost = Math.ceil(timeRemaining / 30000);
        
        if (!ResourceManager.has('gems', cost)) {
            EventBus.emit('not_enough_gems', { needed: cost });
            return false;
        }

        ResourceManager.spend('gems', cost);
        chest.unlockTime = Date.now();
        
        SaveManager.save('chests', {
            activeChests: this.activeChests,
            chestCooldown: this.chestCooldown
        });

        EventBus.emit('chest_instant_opened', { chest, cost });
        this.notifyListeners();
        return true;
    }

    generateRewards(rarity) {
        const chestType = this.chestTypes[rarity];
        const rewards = {};

        // Монеты
        const [coinMin, coinMax] = chestType.rewards.coins;
        rewards.coins = Math.floor(Math.random() * (coinMax - coinMin + 1)) + coinMin;

        // Гемы
        const [gemMin, gemMax] = chestType.rewards.gems;
        if (gemMax > 0) {
            rewards.gems = Math.floor(Math.random() * (gemMax - gemMin + 1)) + gemMin;
        }

        // Шанс на существо
        if (chestType.rewards.creatureChance && Math.random() < chestType.rewards.creatureChance) {
            // Определение редкости существа (на ступень ниже сундука или такая же)
            const rarities = ['common', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
            const currentIndex = rarities.indexOf(rarity);
            const possibleRarities = rarities.slice(0, currentIndex + 1);
            rewards.creature = possibleRarities[Math.floor(Math.random() * possibleRarities.length)];
        }

        return rewards;
    }

    getFreeChestProgress() {
        return {
            ready: this.chestCooldown <= 0,
            timeLeft: Math.max(0, this.chestCooldown),
            percent: 100 - ((this.chestCooldown / this.freeChestInterval) * 100)
        };
    }

    update(deltaTime) {
        if (this.chestCooldown > 0) {
            this.chestCooldown -= deltaTime;
            if (this.chestCooldown < 0) this.chestCooldown = 0;
        }

        // Проверка готовых сундуков
        const readyCount = this.activeChests.filter(c => Date.now() >= c.unlockTime && !c.claimed).length;
        if (readyCount > 0) {
            EventBus.emit('chests_ready', { count: readyCount });
        }
    }

    getActiveChests() {
        return this.activeChests.map(chest => ({
            ...chest,
            timeLeft: Math.max(0, chest.unlockTime - Date.now()),
            ready: Date.now() >= chest.unlockTime
        }));
    }
}
