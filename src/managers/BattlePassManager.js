/**
 * BattlePassManager - Система боевого пропуска и сезонов
 */
class BattlePassManager {
    constructor() {
        this.currentSeason = 1;
        this.seasonStart = Date.now();
        this.seasonDuration = 30 * 24 * 60 * 60 * 1000; // 30 дней
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNextLevel = 1000;
        this.isPremium = false;
        this.claimedRewards = []; // [level1, level2, ...]
        
        this.freeRewards = {
            1: { type: 'coins', amount: 500 },
            2: { type: 'boost', duration: 300 },
            3: { type: 'gems', amount: 10 },
            5: { type: 'chest', rarity: 'rare' },
            10: { type: 'gems', amount: 50 },
            15: { type: 'boost', duration: 600 },
            20: { type: 'chest', rarity: 'epic' },
            25: { type: 'gems', amount: 100 },
            30: { type: 'chest', rarity: 'legendary' },
            40: { type: 'gems', amount: 200 },
            50: { type: 'creature', rarity: 'mythic' }
        };

        this.premiumRewards = {
            1: { type: 'gems', amount: 50 },
            2: { type: 'coins', amount: 2000 },
            3: { type: 'boost', duration: 900 },
            5: { type: 'gems', amount: 100 },
            10: { type: 'chest', rarity: 'epic' },
            15: { type: 'gems', amount: 200 },
            20: { type: 'creature', rarity: 'legendary' },
            25: { type: 'gems', amount: 300 },
            30: { type: 'chest', rarity: 'mythic' },
            40: { type: 'gems', amount: 500 },
            50: { type: 'creature', rarity: 'divine' }
        };

        this.listeners = [];
        
        // Получаем economy из реестра
        this.economyManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
    }

    init() {
        this.loadData();

        // Проверка окончания сезона
        if (Date.now() - this.seasonStart > this.seasonDuration) {
            this.endSeason();
        }

        gameEventBus.on('xp_gain', this.addXP.bind(this));
        gameEventBus.on('battlepass_claim', this.claimReward.bind(this));
        gameEventBus.on('battlepass_premium', this.activatePremium.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    loadData() {
        try {
            const saved = localStorage.getItem('bf_battlepass');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentSeason = data.currentSeason || 1;
                this.seasonStart = data.seasonStart || Date.now();
                this.playerLevel = data.playerLevel || 1;
                this.playerXP = data.playerXP || 0;
                this.xpToNextLevel = data.xpToNextLevel || 1000;
                this.isPremium = data.isPremium || false;
                this.claimedRewards = data.claimedRewards || [];
            }
        } catch (e) {
            Logger.warn('BattlePassManager', 'Не удалось загрузить данные', e);
        }
    }

    saveData() {
        try {
            localStorage.setItem('bf_battlepass', JSON.stringify({
                currentSeason: this.currentSeason,
                seasonStart: this.seasonStart,
                playerLevel: this.playerLevel,
                playerXP: this.playerXP,
                xpToNextLevel: this.xpToNextLevel,
                isPremium: this.isPremium,
                claimedRewards: this.claimedRewards
            }));
        } catch (e) {
            Logger.warn('BattlePassManager', 'Не удалось сохранить данные', e);
        }
    }

    addXP(amount) {
        this.playerXP += amount;
        
        while (this.playerXP >= this.xpToNextLevel && this.playerLevel < 50) {
            this.playerXP -= this.xpToNextLevel;
            this.playerLevel++;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
            gameEventBus.emit('battlepass_level_up', { level: this.playerLevel });
        }

        this.saveData();
        this.notifyListeners();
    }

    claimReward(level, isPremium = false) {
        const key = `${level}_${isPremium ? 'premium' : 'free'}`;
        if (this.claimedRewards.includes(key)) return false;
        if (level > this.playerLevel) return false;

        const reward = isPremium ? this.premiumRewards[level] : this.freeRewards[level];
        if (!reward) return false;

        // Выдача награды через EconomyManager
        if (this.economyManager) {
            if (reward.type === 'coins') {
                this.economyManager.addCurrency(GameConfig.CURRENCY.COINS, reward.amount, 'battlepass');
            } else if (reward.type === 'gems') {
                this.economyManager.addCurrency(GameConfig.CURRENCY.GEMS, reward.amount, 'battlepass');
            }
        }
        
        if (reward.type === 'boost') {
            gameEventBus.emit('activate_boost', { type: 'production', multiplier: 2, duration: reward.duration });
        } else if (reward.type === 'chest') {
            gameEventBus.emit('open_chest', { rarity: reward.rarity });
        } else if (reward.type === 'creature') {
            gameEventBus.emit('gacha_pull', { guaranteedRarity: reward.rarity });
        }

        this.claimedRewards.push(key);
        this.saveData();

        gameEventBus.emit('battlepass_reward_claimed', { level, reward });
        this.notifyListeners();
        return true;
    }

    activatePremium() {
        if (this.isPremium) return;
        this.isPremium = true;
        this.saveData();
        gameEventBus.emit('battlepass_premium_activated');
        this.notifyListeners();
    }

    endSeason() {
        // Выдача наград за сезон
        const finalLevel = this.playerLevel;
        gameEventBus.emit('season_ended', { season: this.currentSeason, level: finalLevel });

        // Сброс сезона
        this.currentSeason++;
        this.seasonStart = Date.now();
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNextLevel = 1000;
        this.claimedRewards = [];
        // isPremium не сбрасываем, если игрок купил навсегда, или сбрасываем если по подписке

        this.saveData();

        this.notifyListeners();
    }

    getProgress() {
        const timePassed = Date.now() - this.seasonStart;
        const timeLeft = Math.max(0, this.seasonDuration - timePassed);
        const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

        return {
            season: this.currentSeason,
            level: this.playerLevel,
            xp: this.playerXP,
            xpNeeded: this.xpToNextLevel,
            progress: (this.playerXP / this.xpToNextLevel) * 100,
            isPremium: this.isPremium,
            daysLeft: daysLeft
        };
    }
}