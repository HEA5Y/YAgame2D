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
    }

    init() {
        const saved = SaveManager.load('battlepass');
        if (saved) {
            Object.assign(this, saved);
        }
        
        // Проверка окончания сезона
        if (Date.now() - this.seasonStart > this.seasonDuration) {
            this.endSeason();
        }

        EventBus.on('xp_gain', this.addXP.bind(this));
        EventBus.on('battlepass_claim', this.claimReward.bind(this));
        EventBus.on('battlepass_premium', this.activatePremium.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    addXP(amount) {
        this.playerXP += amount;
        
        while (this.playerXP >= this.xpToNextLevel && this.playerLevel < 50) {
            this.playerXP -= this.xpToNextLevel;
            this.playerLevel++;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
            EventBus.emit('battlepass_level_up', { level: this.playerLevel });
        }

        SaveManager.save('battlepass', {
            currentSeason: this.currentSeason,
            seasonStart: this.seasonStart,
            playerLevel: this.playerLevel,
            playerXP: this.playerXP,
            xpToNextLevel: this.xpToNextLevel,
            isPremium: this.isPremium,
            claimedRewards: this.claimedRewards
        });
        
        this.notifyListeners();
    }

    claimReward(level, isPremium = false) {
        const key = `${level}_${isPremium ? 'premium' : 'free'}`;
        if (this.claimedRewards.includes(key)) return false;
        if (level > this.playerLevel) return false;

        const reward = isPremium ? this.premiumRewards[level] : this.freeRewards[level];
        if (!reward) return false;

        // Выдача награды
        if (reward.type === 'coins') {
            ResourceManager.add('coins', reward.amount);
        } else if (reward.type === 'gems') {
            ResourceManager.add('gems', reward.amount);
        } else if (reward.type === 'boost') {
            // Активация буста
            EventBus.emit('activate_boost', { type: 'production', multiplier: 2, duration: reward.duration });
        } else if (reward.type === 'chest') {
            EventBus.emit('open_chest', { rarity: reward.rarity });
        } else if (reward.type === 'creature') {
            EventBus.emit('gacha_pull', { guaranteedRarity: reward.rarity });
        }

        this.claimedRewards.push(key);
        SaveManager.save('battlepass', {
            currentSeason: this.currentSeason,
            seasonStart: this.seasonStart,
            playerLevel: this.playerLevel,
            playerXP: this.playerXP,
            xpToNextLevel: this.xpToNextLevel,
            isPremium: this.isPremium,
            claimedRewards: this.claimedRewards
        });

        EventBus.emit('battlepass_reward_claimed', { level, reward });
        this.notifyListeners();
        return true;
    }

    activatePremium() {
        if (this.isPremium) return;
        this.isPremium = true;
        SaveManager.save('battlepass', {
            currentSeason: this.currentSeason,
            seasonStart: this.seasonStart,
            playerLevel: this.playerLevel,
            playerXP: this.playerXP,
            xpToNextLevel: this.xpToNextLevel,
            isPremium: this.isPremium,
            claimedRewards: this.claimedRewards
        });
        EventBus.emit('battlepass_premium_activated');
        this.notifyListeners();
    }

    endSeason() {
        // Выдача наград за сезон
        const finalLevel = this.playerLevel;
        EventBus.emit('season_ended', { season: this.currentSeason, level: finalLevel });

        // Сброс сезона
        this.currentSeason++;
        this.seasonStart = Date.now();
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNextLevel = 1000;
        this.claimedRewards = [];
        // isPremium не сбрасываем, если игрок купил навсегда, или сбрасываем если按月

        SaveManager.save('battlepass', {
            currentSeason: this.currentSeason,
            seasonStart: this.seasonStart,
            playerLevel: this.playerLevel,
            playerXP: this.playerXP,
            xpToNextLevel: this.xpToNextLevel,
            isPremium: this.isPremium,
            claimedRewards: this.claimedRewards
        });

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
