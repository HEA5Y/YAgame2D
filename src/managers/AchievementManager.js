/**
 * AchievementManager.js
 * Управляет достижениями (200+).
 */

class AchievementManager {
    constructor(saveManager) {
        this.achievements = new Map(); // id -> Achievement
        this.unlockedIds = new Set();
        this.progress = new Map(); // id -> числовой прогресс
        this.saveManager = saveManager;
        if (saveManager) saveManager.registerSubsystem('achievements', this);
        this.initAchievements();
        this.subscribeEvents();
    }

    initAchievements() {
        AchievementData.forEach(tpl => {
            const ach = new Achievement(tpl);
            this.achievements.set(ach.id, ach);
            this.progress.set(ach.id, 0);
        });
        Logger.info('AchievementManager', `Загружено ${this.achievements.size} достижений`);
    }

    subscribeEvents() {
        // Слушаем изменения монет (общий заработок)
        gameEventBus.on(GameConfig.EVENTS.CURRENCY_CHANGED, (data) => {
            if (data.currency === GameConfig.CURRENCY.COINS && data.delta.isGreaterThan(0)) {
                // ИСПРАВЛЕНО: получаем economy из реестра
                const econ = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
                const total = econ ? econ.getBalance(GameConfig.CURRENCY.COINS) : new BigNumber(0);
                this.updateProgress('coins_total', total.toNumber());
            }
        });

        // Слушаем покупку улучшений
        gameEventBus.on(GameConfig.EVENTS.UPGRADE_BOUGHT, (data) => {
            // увеличиваем счётчик улучшений
            let count = this.progress.get('upgrades_purchased') || 0;
            count++;
            this.updateProgress('upgrades_purchased', count);
        });

        // Слушаем престиж
        gameEventBus.on(GameConfig.EVENTS.PRESTIGE_ACTIVATED, (data) => {
            let count = this.progress.get('prestige_count') || 0;
            count++;
            this.updateProgress('prestige_count', count);
        });

        // Слушаем исследования (позже)
        // Слушаем коллекцию существ (позже)

        // Время игры обновляется в TimeManager, но мы будем обновлять прогресс каждую минуту
        setInterval(() => {
            // ИСПРАВЛЕНО: получаем time из реестра
            const timeManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('time') : null;
            const time = timeManager ? timeManager.totalPlayTime : 0;
            this.updateProgress('play_time', time);
        }, 60000);
    }

    /**
     * Обновить прогресс конкретного достижения (по типу)
     */
    updateProgress(type, value) {
        // Ищем все достижения этого типа
        for (const [id, ach] of this.achievements) {
            if (ach.type === type) {
                this.progress.set(id, value);
                this.checkAchievement(id);
            }
        }
    }

    /**
     * Проверить, не разблокировано ли достижение
     */
    checkAchievement(id) {
        const ach = this.achievements.get(id);
        if (!ach || this.unlockedIds.has(id)) return;
        const progress = this.progress.get(id) || 0;
        if (ach.condition(progress)) {
            this.unlock(id);
        }
    }

    /**
     * Разблокировать достижение
     */
    unlock(id) {
        const ach = this.achievements.get(id);
        if (!ach) return;
        this.unlockedIds.add(id);

        // Награда — получаем economy из реестра
        const econ = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
        if (econ) {
            if (ach.reward.gems) {
                econ.addCurrency(GameConfig.CURRENCY.GEMS, ach.reward.gems, 'achievement');
            }
            if (ach.reward.coins) {
                econ.addCurrency(GameConfig.CURRENCY.COINS, ach.reward.coins, 'achievement');
            }
            if (ach.reward.research) {
                econ.addCurrency(GameConfig.CURRENCY.RESEARCH_POINTS, ach.reward.research, 'achievement');
            }
        }

        // Показать уведомление
        gameEventBus.emit(GameConfig.EVENTS.ACHIEVEMENT_UNLOCKED, {
            id: ach.id,
            name: ach.name,
            description: ach.description
        });

        Logger.info('AchievementManager', `Достижение разблокировано: ${ach.name}`);
    }

    // --- Сохранение ---

    getSaveData() {
        return {
            unlocked: Array.from(this.unlockedIds),
            progress: Object.fromEntries(this.progress)
        };
    }

    loadSaveData(data) {
        if (!data) return;
        if (data.unlocked) data.unlocked.forEach(id => this.unlockedIds.add(id));
        if (data.progress) {
            for (const [id, val] of Object.entries(data.progress)) {
                this.progress.set(id, val);
            }
        }
        // Перепроверить все достижения (на случай, если прогресс изменился оффлайн)
        for (const id of this.achievements.keys()) {
            this.checkAchievement(id);
        }
        Logger.info('AchievementManager', 'Данные достижений загружены');
    }
}

class Achievement {
    constructor(tpl) {
        this.id = tpl.id;
        this.name = tpl.name;
        this.description = tpl.description;
        this.type = tpl.type;
        this.condition = tpl.condition;
        this.reward = tpl.reward || {};
    }
}