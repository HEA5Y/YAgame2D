/**
 * QuestManager.js
 * Управляет квестами (ежедневные, еженедельные, сезонные).
 */

class QuestManager {
    constructor(saveManager) {
        this.saveManager = saveManager;
        if (saveManager) saveManager.registerSubsystem('quests', this);

        this.activeQuests = []; // массив объектов Quest
        this.completedQuests = []; // id завершённых квестов (для истории)
        this.lastDailyReset = Date.now();
        this.lastWeeklyReset = Date.now();
        this.seasonalQuests = []; // постоянные на сезон

        this.initQuests();
        this.subscribeEvents();
        this.checkResets();
    }

    initQuests() {
        // Ежедневные квесты
        this.dailyQuestPool = QuestData.dailyQuests;
        this.weeklyQuestPool = QuestData.weeklyQuests;
        this.seasonalQuestPool = QuestData.seasonalQuests;

        // Генерация активных квестов
        this.generateDailyQuests();
        this.generateWeeklyQuests();
        this.generateSeasonalQuests();
    }

    generateDailyQuests() {
        // Выбираем 3 случайных ежедневных квеста
        const shuffled = this.shuffleArray(this.dailyQuestPool); // ← теперь клонирует
        const selected = shuffled.slice(0, 3);
        // Очищаем предыдущие ежедневные
        this.activeQuests = this.activeQuests.filter(q => q.resetPeriod !== 'daily');
        selected.forEach(tpl => {
            this.activeQuests.push(new Quest(tpl, 'daily'));
        });
    }

    generateWeeklyQuests() {
        const shuffled = this.shuffleArray(this.weeklyQuestPool);
        const selected = shuffled.slice(0, 2);
        this.activeQuests = this.activeQuests.filter(q => q.resetPeriod !== 'weekly');
        selected.forEach(tpl => {
            this.activeQuests.push(new Quest(tpl, 'weekly'));
        });
    }

    generateSeasonalQuests() {
        // Сезонные квесты (например, 5 штук на сезон)
        const shuffled = this.shuffleArray(this.seasonalQuestPool);
        const selected = shuffled.slice(0, 5);
        this.activeQuests = this.activeQuests.filter(q => q.resetPeriod !== 'seasonal');
        selected.forEach(tpl => {
            this.activeQuests.push(new Quest(tpl, 'seasonal'));
        });
    }

    /**
     * Немутирующий shuffle — клонирует массив перед перемешиванием
     */
    shuffleArray(arr) {
        const copy = [...arr]; // ← клонируем, не мутируем оригинал
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    checkResets() {
        const now = Date.now();
        // Ежедневный сброс (каждые 24 часа)
        if (now - this.lastDailyReset > 24 * 3600000) {
            this.lastDailyReset = now;
            this.generateDailyQuests();
            Logger.info('QuestManager', 'Ежедневные квесты обновлены');
        }
        // Еженедельный сброс (каждые 7 дней)
        if (now - this.lastWeeklyReset > 7 * 24 * 3600000) {
            this.lastWeeklyReset = now;
            this.generateWeeklyQuests();
            Logger.info('QuestManager', 'Еженедельные квесты обновлены');
        }
        // Сезонный сброс – например, раз в месяц
        // Можно добавить проверку по дате
    }

    subscribeEvents() {
        // Обновление прогресса квестов
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, (data) => {
            if (data.currency === GameConfig.CURRENCY.COINS && data.delta.isGreaterThan(0)) {
                this.updateQuestProgress('produce', data.delta.toNumber());
            }
        });

        gameEventBus.on(GameConfig.EVENTS.UPGRADE_BOUGHT, (data) => {
            this.updateQuestProgress('upgrade', 1);
        });

        gameEventBus.on(GameConfig.EVENTS.RESEARCH_COMPLETED, (data) => {
            this.updateQuestProgress('research', 1);
        });

        gameEventBus.on('manual_collect', () => {
            this.updateQuestProgress('collect_manual', 1);
        });

        gameEventBus.on('ad_watched', () => {
            this.updateQuestProgress('watch_ad', 1);
        });

        // Престиж
        gameEventBus.on(GameConfig.EVENTS.PRESTIGE_ACTIVATED, () => {
            this.updateQuestProgress('prestige', 1);
        });

        // Достижения
        gameEventBus.on(GameConfig.EVENTS.ACHIEVEMENT_UNLOCKED, () => {
            this.updateQuestProgress('achievement', 1);
        });

        // Коллекция существ (позже)
    }

    updateQuestProgress(type, amount) {
        for (const quest of this.activeQuests) {
            if (quest.type === type && !quest.completed) {
                quest.progress += amount;
                if (quest.progress >= quest.goal) {
                    this.completeQuest(quest);
                }
            }
        }
    }

    completeQuest(quest) {
        if (quest.completed) return;
        quest.completed = true;
        
        // Награда через EconomyManager из реестра
        const econ = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
        if (econ) {
            if (quest.reward.coins) {
                econ.addCurrency(GameConfig.CURRENCY.COINS, quest.reward.coins, 'quest');
            }
            if (quest.reward.gems) {
                econ.addCurrency(GameConfig.CURRENCY.GEMS, quest.reward.gems, 'quest');
            }
            if (quest.reward.research) {
                econ.addCurrency(GameConfig.CURRENCY.RESEARCH_POINTS, quest.reward.research, 'quest');
            }
        }

        this.completedQuests.push(quest.id);
        gameEventBus.emit(GameConfig.EVENTS.QUEST_COMPLETED, {
            id: quest.id,
            name: quest.description,
            reward: quest.reward
        });
        Logger.info('QuestManager', `Квест выполнен: ${quest.description}`);
    }

    // --- Сохранение ---

    getSaveData() {
        return {
            activeQuests: this.activeQuests.map(q => q.getData()),
            completedQuests: this.completedQuests,
            lastDailyReset: this.lastDailyReset,
            lastWeeklyReset: this.lastWeeklyReset
        };
    }

    loadSaveData(data) {
        if (!data) return;
        this.completedQuests = data.completedQuests || [];
        this.lastDailyReset = data.lastDailyReset || Date.now();
        this.lastWeeklyReset = data.lastWeeklyReset || Date.now();

        // Восстанавливаем активные квесты
        if (data.activeQuests) {
            this.activeQuests = data.activeQuests.map(qData => Quest.fromData(qData));
        }
        this.checkResets();
        Logger.info('QuestManager', 'Данные квестов загружены');
    }
}

class Quest {
    constructor(tpl, resetPeriod) {
        this.id = tpl.id;
        this.description = tpl.description;
        this.goal = tpl.goal;
        this.reward = tpl.reward;
        this.resetPeriod = resetPeriod; // 'daily', 'weekly', 'seasonal'
        this.type = this.inferType(tpl.id);
        this.progress = 0;
        this.completed = false;
    }

    inferType(id) {
        if (id.startsWith('daily_produce') || id.startsWith('weekly_produce') || id.startsWith('seasonal_produce')) return 'produce';
        if (id.includes('upgrade')) return 'upgrade';
        if (id.includes('research')) return 'research';
        if (id.includes('collect')) return 'collect_manual';
        if (id.includes('watch')) return 'watch_ad';
        if (id.includes('prestige')) return 'prestige';
        if (id.includes('achievement')) return 'achievement';
        return 'produce';
    }

    getData() {
        return {
            id: this.id,
            description: this.description,
            goal: this.goal,
            reward: this.reward,
            resetPeriod: this.resetPeriod,
            type: this.type,
            progress: this.progress,
            completed: this.completed
        };
    }

    static fromData(data) {
        const q = new Quest(data, data.resetPeriod);
        q.progress = data.progress || 0;
        q.completed = data.completed || false;
        return q;
    }
}