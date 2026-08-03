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
        this.chestCooldown = 0; // Время до следующего бесплатного сундука (в СЕКУНДАХ)
        this.freeChestInterval = 600; // 10 минут = 600 СЕКУНД (исправлено с мс)
        
        this.listeners = [];
        
        // Получаем менеджер экономики из реестра
        this.economyManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
    }

    init() {
        this.loadChestData();

        gameEventBus.on('open_chest', this.openChest.bind(this));
        gameEventBus.on('claim_chest', this.claimChest.bind(this));
        gameEventBus.on('instant_open', this.instantOpenChest.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    /**
     * Загрузка данных сундуков из localStorage
     */
    loadChestData() {
        try {
            const saved = localStorage.getItem('bf_chests');
            if (saved) {
                const data = JSON.parse(saved);
                this.activeChests = data.activeChests || [];
                this.chestCooldown = data.chestCooldown || 0;
            }
        } catch (e) {
            Logger.warn('ChestManager', 'Не удалось загрузить данные сундуков', e);
        }
    }

    /**
     * Сохранение данных сундуков в localStorage
     */
    saveChestData() {
        try {
            localStorage.setItem('bf_chests', JSON.stringify({
                activeChests: this.activeChests,
                chestCooldown: this.chestCooldown
            }));
        } catch (e) {
            Logger.warn('ChestManager', 'Не удалось сохранить данные сундуков', e);
        }
    }

    openChest({ rarity, free = false }) {
        const chestType = this.chestTypes[rarity];
        if (!chestType) return null;

        // Проверка лимитов для бесплатных сундуков
        if (free && this.chestCooldown > 0) {
            Logger.warn('ChestManager', 'Free chest on cooldown!');
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

        this.saveChestData();

        gameEventBus.emit('chest_opened', { chest });
        this.notifyListeners();
        return chest;
    }

    claimChest(chestId) {
        const chestIndex = this.activeChests.findIndex(c => c.id === chestId);
        if (chestIndex === -1) return null;

        const chest = this.activeChests[chestIndex];
        const chestType = this.chestTypes[chest.type];

        if (Date.now() < chest.unlockTime) {
            Logger.warn('ChestManager', 'Chest not ready yet!');
            return null;
        }

        if (chest.claimed) {
            Logger.warn('ChestManager', 'Chest already claimed!');
            return null;
        }

        // Генерация наград
        const rewards = this.generateRewards(chest.type);
        
        // Выдача наград через EconomyManager
        if (this.economyManager) {
            if (rewards.coins) {
                this.economyManager.addCurrency(GameConfig.CURRENCY.COINS, rewards.coins, 'chest_reward');
            }
            if (rewards.gems) {
                this.economyManager.addCurrency(GameConfig.CURRENCY.GEMS, rewards.gems, 'chest_reward');
            }
        }
        
        if (rewards.creature) {
            gameEventBus.emit('gacha_pull', { guaranteedRarity: rewards.creature });
        }

        chest.claimed = true;
        this.activeChests.splice(chestIndex, 1); // Удаление после получения

        this.saveChestData();

        gameEventBus.emit('chest_claimed', { chest, rewards });
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
        
        if (!this.economyManager || !this.economyManager.hasEnough(GameConfig.CURRENCY.GEMS, cost)) {
            gameEventBus.emit('not_enough_gems', { needed: cost });
            return false;
        }

        this.economyManager.spendCurrency(GameConfig.CURRENCY.GEMS, cost, 'chest_instant_open');
        chest.unlockTime = Date.now();
        
        this.saveChestData();

        gameEventBus.emit('chest_instant_opened', { chest, cost });
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
            gameEventBus.emit('chests_ready', { count: readyCount });
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