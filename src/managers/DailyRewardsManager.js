/**
 * DailyRewardsManager - Ежедневные награды и задания
 */
class DailyRewardsManager {
    constructor() {
        this.lastClaimDate = null;
        this.streak = 0;
        this.claimedToday = false;
        
        this.dailyRewards = [
            { day: 1, type: 'coins', amount: 100 },
            { day: 2, type: 'boost', duration: 300 },
            { day: 3, type: 'gems', amount: 10 },
            { day: 4, type: 'coins', amount: 250 },
            { day: 5, type: 'chest', rarity: 'common' },
            { day: 6, type: 'gems', amount: 25 },
            { day: 7, type: 'chest', rarity: 'rare' }, // Недельный бонус
            { day: 8, type: 'coins', amount: 500 },
            { day: 9, type: 'boost', duration: 600 },
            { day: 10, type: 'gems', amount: 50 },
            { day: 11, type: 'coins', amount: 750 },
            { day: 12, type: 'chest', rarity: 'epic' },
            { day: 13, type: 'gems', amount: 75 },
            { day: 14, type: 'creature', rarity: 'legendary' }, // Двухнедельный бонус
            { day: 15, type: 'gems', amount: 100 },
            { day: 16, type: 'coins', amount: 1000 },
            { day: 17, type: 'boost', duration: 900 },
            { day: 18, type: 'gems', amount: 150 },
            { day: 19, type: 'chest', rarity: 'legendary' },
            { day: 20, type: 'coins', amount: 2000 },
            { day: 21, type: 'creature', rarity: 'mythic' }, // Трехнедельный бонус
            { day: 22, type: 'gems', amount: 200 },
            { day: 23, type: 'coins', amount: 3000 },
            { day: 24, type: 'boost', duration: 1800 },
            { day: 25, type: 'gems', amount: 300 },
            { day: 26, type: 'chest', rarity: 'mythic' },
            { day: 27, type: 'coins', amount: 5000 },
            { day: 28, type: 'gems', amount: 500 },
            { day: 29, type: 'boost', duration: 3600 },
            { day: 30, type: 'creature', rarity: 'divine' } // Месячный супер-бонус
        ];

        this.dailyQuests = [];
        this.questRefreshTime = null;
        
        this.listeners = [];
    }

    init() {
        const saved = SaveManager.load('daily');
        if (saved) {
            this.lastClaimDate = saved.lastClaimDate;
            this.streak = saved.streak || 0;
            this.dailyQuests = saved.dailyQuests || [];
            this.questRefreshTime = saved.questRefreshTime;
        }

        this.checkDayReset();
        this.generateDailyQuestsIfNeeded();

        EventBus.on('daily_claim', this.claimDaily.bind(this));
        EventBus.on('quest_complete', this.completeQuest.bind(this));
        EventBus.on('daily_refresh', this.refreshQuests.bind(this));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    }

    checkDayReset() {
        const today = new Date().toDateString();
        
        if (this.lastClaimDate !== today) {
            this.claimedToday = false;
            
            // Проверка на пропуск дня
            if (this.lastClaimDate) {
                const lastDate = new Date(this.lastClaimDate);
                const now = new Date();
                const diffDays = Math.floor((now - lastDate) / (24 * 60 * 60 * 1000));
                
                if (diffDays > 1) {
                    this.streak = 0; // Сброс серии при пропуске
                    Logger.info('Daily streak reset!');
                }
            }
        }
    }

    claimDaily() {
        if (this.claimedToday) return false;

        const today = new Date().toDateString();
        this.lastClaimDate = today;
        this.claimedToday = true;
        this.streak++;

        // Получение награды за день (циклично 1-30)
        const dayIndex = ((this.streak - 1) % 30);
        const reward = this.dailyRewards[dayIndex];

        // Выдача награды
        if (reward.type === 'coins') {
            ResourceManager.add('coins', reward.amount);
        } else if (reward.type === 'gems') {
            ResourceManager.add('gems', reward.amount);
        } else if (reward.type === 'boost') {
            EventBus.emit('activate_boost', { type: 'production', multiplier: 2, duration: reward.duration });
        } else if (reward.type === 'chest') {
            EventBus.emit('open_chest', { rarity: reward.rarity, free: true });
        } else if (reward.type === 'creature') {
            EventBus.emit('gacha_pull', { guaranteedRarity: reward.rarity });
        }

        // Бонус за серию
        if (this.streak % 7 === 0) {
            const bonus = Math.floor(reward.amount * 0.5);
            if (reward.type === 'coins') ResourceManager.add('coins', bonus);
            if (reward.type === 'gems') ResourceManager.add('gems', Math.floor(bonus / 10));
            EventBus.emit('daily_streak_bonus', { streak: this.streak, bonus });
        }

        SaveManager.save('daily', {
            lastClaimDate: this.lastClaimDate,
            streak: this.streak,
            dailyQuests: this.dailyQuests,
            questRefreshTime: this.questRefreshTime
        });

        EventBus.emit('daily_reward_claimed', { day: dayIndex + 1, reward, streak: this.streak });
        this.notifyListeners();
        return true;
    }

    generateDailyQuestsIfNeeded() {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        if (!this.questRefreshTime || now - this.questRefreshTime > dayMs) {
            this.refreshQuests();
        }
    }

    refreshQuests() {
        const questTemplates = [
            { id: 'click_100', type: 'click', target: 100, reward: { type: 'coins', amount: 500 } },
            { id: 'produce_1000', type: 'produce', target: 1000, reward: { type: 'gems', amount: 10 } },
            { id: 'upgrade_5', type: 'upgrade', target: 5, reward: { type: 'coins', amount: 1000 } },
            { id: 'collect_5000', type: 'collect', target: 5000, reward: { type: 'chest', rarity: 'common' } },
            { id: 'prestige_1', type: 'prestige', target: 1, reward: { type: 'gems', amount: 50 } }
        ];

        // Выбор 3 случайных квестов
        this.dailyQuests = [];
        const shuffled = questTemplates.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < 3 && i < shuffled.length; i++) {
            this.dailyQuests.push({
                ...shuffled[i],
                progress: 0,
                completed: false,
                claimed: false
            });
        }

        this.questRefreshTime = Date.now();
        SaveManager.save('daily', {
            lastClaimDate: this.lastClaimDate,
            streak: this.streak,
            dailyQuests: this.dailyQuests,
            questRefreshTime: this.questRefreshTime
        });

        EventBus.emit('daily_quests_refreshed', { quests: this.dailyQuests });
        this.notifyListeners();
    }

    completeQuest(questId, amount = 1) {
        const quest = this.dailyQuests.find(q => q.id === questId);
        if (!quest || quest.completed) return;

        quest.progress += amount;
        
        if (quest.progress >= quest.target && !quest.completed) {
            quest.completed = true;
            EventBus.emit('quest_completed', { quest });
            
            // Выдача награды
            if (quest.reward.type === 'coins') {
                ResourceManager.add('coins', quest.reward.amount);
            } else if (quest.reward.type === 'gems') {
                ResourceManager.add('gems', quest.reward.amount);
            } else if (quest.reward.type === 'chest') {
                EventBus.emit('open_chest', { rarity: quest.reward.rarity, free: true });
            }
        }

        SaveManager.save('daily', {
            lastClaimDate: this.lastClaimDate,
            streak: this.streak,
            dailyQuests: this.dailyQuests,
            questRefreshTime: this.questRefreshTime
        });

        this.notifyListeners();
    }

    getProgress() {
        const now = Date.now();
        const timeUntilRefresh = this.questRefreshTime 
            ? Math.max(0, 24 * 60 * 60 * 1000 - (now - this.questRefreshTime))
            : 0;

        return {
            streak: this.streak,
            claimedToday: this.claimedToday,
            quests: this.dailyQuests,
            timeUntilRefresh: timeUntilRefresh,
            hoursUntilRefresh: Math.ceil(timeUntilRefresh / (60 * 60 * 1000))
        };
    }
}
