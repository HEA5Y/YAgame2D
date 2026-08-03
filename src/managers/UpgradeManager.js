/**
 * UpgradeManager.js
 * Управляет всеми улучшениями в игре.
 * Полностью отвязан от глобальных пространств имен (window).
 */
class UpgradeManager {
    /**
     * @param {SaveManager} saveManager Менеджер сохранений для регистрации подсистемы
     * @param {EconomyManager} economyManager Менеджер экономики для работы с транзакциями
     */
    constructor(saveManager, economyManager) {
        this.upgrades = new Map();
        this.purchased = new Map();
        this.saveManager = saveManager;
        this.economyManager = economyManager; 

        if (saveManager) saveManager.registerSubsystem('upgrades', this);
        this.initUpgrades();
        this.applyAllEffects();
        this.subscribeEvents();
    }

    initUpgrades() {
        // Загрузка сырых данных шаблонов улучшений
        UpgradeData.forEach(tpl => {
            const upgrade = new Upgrade(tpl);
            this.upgrades.set(upgrade.id, upgrade);
            this.purchased.set(upgrade.id, 0);
        });
        Logger.info('UpgradeManager', `Загружено ${this.upgrades.size} улучшений`);
    }

    subscribeEvents() {
        // ИСПРАВЛЕНО: используем правильное имя события из GameConfig
        gameEventBus.on(GameConfig.EVENTS.UPGRADE_BOUGHT, (data) => {
            const upgrade = this.upgrades.get(data.id);
            if (upgrade) {
                upgrade.applyEffect(data.newLevel, this.economyManager);
            }
        });
    }

    /**
     * Применяет эффекты всех купленных улучшений
     * ИСПРАВЛЕНО: сначала сбрасываем множители, потом применяем
     */
    applyAllEffects() {
        if (!this.economyManager) return;

        // Сброс глобальных множителей к базовым значениям
        this.economyManager.setGlobalMultiplier('income', 1.0);
        this.economyManager.setGlobalMultiplier('costDiscount', 1.0);

        // Применяем эффекты всех купленных улучшений
        for (const [id, level] of this.purchased) {
            if (level > 0) {
                const upgrade = this.upgrades.get(id);
                if (upgrade) upgrade.applyEffect(level, this.economyManager);
            }
        }
    }

    /**
     * Получить объект улучшения
     */
    getUpgrade(id) {
        return this.upgrades.get(id);
    }

    /**
     * Получить текущий уровень улучшения
     */
    getLevel(id) {
        return this.purchased.get(id) || 0;
    }

    /**
     * Рассчитать стоимость покупки N уровней
     * @param {string} id
     * @param {number} levels
     * @returns {BigNumber}
     */
    getCost(id, levels = 1) {
        const upgrade = this.upgrades.get(id);
        if (!upgrade) return new BigNumber(0);
        const current = this.getLevel(id);
        
        let cost = new BigNumber(upgrade.baseCost);
        let total = new BigNumber(0);
        
        for (let i = 0; i < levels; i++) {
            const levelCost = cost.multiply(Math.pow(upgrade.costMultiplier, current + i));
            total = total.add(levelCost);
        }
        return total;
    }

    /**
     * Покупка улучшения
     * @param {string} id
     * @param {number} levels
     * @returns {boolean}
     */
    purchase(id, levels = 1) {
        const upgrade = this.upgrades.get(id);
        if (!upgrade) {
            Logger.warn('UpgradeManager', `Улучшение ${id} не найдено`);
            return false;
        }
        
        const current = this.getLevel(id);
        if (current >= upgrade.maxLevel) {
            Logger.debug('UpgradeManager', `Улучшение ${id} уже максимального уровня`);
            return false;
        }
        
        const cost = this.getCost(id, levels);
        
        // Проверка баланса через инжектированный менеджер экономики
        if (!this.economyManager.hasEnough(GameConfig.CURRENCY.COINS, cost)) {
            Logger.debug('UpgradeManager', `Не хватает монет для ${id}`);
            return false;
        }
        
        if (!this.economyManager.spendCurrency(GameConfig.CURRENCY.COINS, cost, `upgrade_${id}`)) {
            return false;
        }

        const newLevel = Math.min(current + levels, upgrade.maxLevel);
        this.purchased.set(id, newLevel);
        
        // Применяем изменения
        upgrade.applyEffect(newLevel, this.economyManager);
        
        // ИСПРАВЛЕНО: эмитим правильное событие
        gameEventBus.emit(GameConfig.EVENTS.UPGRADE_BOUGHT, { id, newLevel, cost });
        Logger.info('UpgradeManager', `Куплено улучшение ${id} до уровня ${newLevel}`);
        return true;
    }

    /**
     * Получить все улучшения по категории
     */
    getByCategory(category) {
        const result = [];
        for (const [id, upgrade] of this.upgrades) {
            if (upgrade.category === category) {
                result.push(upgrade);
            }
        }
        return result;
    }

    // --- Логика Сохранения / Загрузки ---

    getSaveData() {
        const data = {};
        for (const [id, level] of this.purchased) {
            if (level > 0) data[id] = level;
        }
        return data;
    }

    loadSaveData(data) {
        if (!data) return;
        for (const [id, level] of Object.entries(data)) {
            if (this.purchased.has(id)) {
                this.purchased.set(id, level);
            }
        }
        // ИСПРАВЛЕНО: пересчитываем с нуля, не накапливаем
        this.applyAllEffects();
        Logger.info('UpgradeManager', 'Данные улучшений загружены');
    }
}

/**
 * Класс Upgrade – представление сущности одного улучшения
 */
class Upgrade {
    constructor(tpl) {
        this.id = tpl.id;
        this.name = tpl.name;
        this.description = tpl.description;
        this.category = tpl.category;
        this.baseCost = tpl.baseCost;
        this.maxLevel = tpl.maxLevel || 50;
        this.costMultiplier = tpl.costMultiplier || 1.15;
        this.effect = tpl.effect;
        this.icon = tpl.icon || '';
    }

    /**
     * Применить эффект к экономике
     * @param {number} level
     * @param {EconomyManager} economyManager
     */
    applyEffect(level, economyManager) {
        if (level <= 0 || !economyManager) return;
        const bonus = this.effect(level);

        if (bonus.speedMultiplier) {
            gameEventBus.emit('modifier_speed', bonus.speedMultiplier);
        }
        if (bonus.incomeMultiplier) {
            // ИСПРАВЛЕНО: используем setGlobalMultiplier вместо прямого доступа
            const currentIncome = economyManager.getIncomeMultiplier();
            economyManager.setGlobalMultiplier('income', currentIncome * bonus.incomeMultiplier);
        }
        if (bonus.costDiscount) {
            const currentDiscount = economyManager.globalMultipliers.costDiscount;
            economyManager.setGlobalMultiplier('costDiscount', currentDiscount * bonus.costDiscount);
        }
        if (bonus.energyMultiplier) {
            gameEventBus.emit('modifier_energy', bonus.energyMultiplier);
        }
        if (bonus.rarityBoost) {
            // Зарезервировано под CollectionManager
        }
        if (bonus.luckBoost) {
            // Зарезервировано под EventManager
        }
        if (bonus.efficiencyMultiplier) {
            // Зарезервировано под FactoryManager
        }
        if (bonus.automationLevel) {
            // Зарезервировано под FactoryManager
        }
    }
}