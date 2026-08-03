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
        this.upgrades = new Map(); //[cite: 45]
        this.purchased = new Map(); //[cite: 45]
        this.saveManager = saveManager; //[cite: 45]
        this.economyManager = economyManager; 

        if (saveManager) saveManager.registerSubsystem('upgrades', this); //[cite: 45]
        this.initUpgrades(); //[cite: 45]
        this.applyAllEffects(); //[cite: 45]
        this.subscribeEvents(); //[cite: 45]
    }

    initUpgrades() {
        // Загрузка сырых данных шаблонов улучшений
        UpgradeData.forEach(tpl => {
            const upgrade = new Upgrade(tpl); //[cite: 45]
            this.upgrades.set(upgrade.id, upgrade); //[cite: 45]
            this.purchased.set(upgrade.id, 0); //[cite: 45]
        });
        Logger.info('UpgradeManager', `Загружено ${this.upgrades.size} улучшений`); //[cite: 45]
    }

    subscribeEvents() {
        gameEventBus.on('upgrade_purchased', (data) => {
            const upgrade = this.upgrades.get(data.id); //[cite: 45]
            if (upgrade) {
                upgrade.applyEffect(data.newLevel, this.economyManager); //[cite: 45]
            }
        });
    }

    /**
     * Применяет эффекты всех купленных улучшений
     */
    applyAllEffects() {
        for (const [id, level] of this.purchased) { //[cite: 45]
            if (level > 0) { //[cite: 45]
                const upgrade = this.upgrades.get(id); //[cite: 45]
                if (upgrade) upgrade.applyEffect(level, this.economyManager); //[cite: 45]
            }
        }
    }

    /**
     * Получить объект улучшения
     */
    getUpgrade(id) {
        return this.upgrades.get(id); //[cite: 45]
    }

    /**
     * Получить текущий уровень улучшения
     */
    getLevel(id) {
        return this.purchased.get(id) || 0; //[cite: 45]
    }

    /**
     * Рассчитать стоимость покупки N уровней
     * @param {string} id
     * @param {number} levels
     * @returns {BigNumber}
     */
    getCost(id, levels = 1) {
        const upgrade = this.upgrades.get(id); //[cite: 45]
        if (!upgrade) return new BigNumber(0); //[cite: 45]
        const current = this.getLevel(id); //[cite: 45]
        
        let cost = new BigNumber(upgrade.baseCost); //[cite: 45]
        let total = new BigNumber(0); //[cite: 45]
        
        for (let i = 0; i < levels; i++) {
            const levelCost = cost.multiply(Math.pow(upgrade.costMultiplier, current + i)); //[cite: 45]
            total = total.add(levelCost); //[cite: 45]
        }
        return total; //[cite: 45]
    }

    /**
     * Покупка улучшения
     * @param {string} id
     * @param {number} levels
     * @returns {boolean}
     */
    purchase(id, levels = 1) {
        const upgrade = this.upgrades.get(id); //[cite: 45]
        if (!upgrade) {
            Logger.warn('UpgradeManager', `Улучшение ${id} не найдено`); //[cite: 45]
            return false;
        }
        
        const current = this.getLevel(id); //[cite: 45]
        if (current >= upgrade.maxLevel) {
            Logger.debug('UpgradeManager', `Улучшение ${id} уже максимального уровня`); //[cite: 45]
            return false;
        }
        
        const cost = this.getCost(id, levels); //[cite: 45]
        
        // Проверка баланса через инжектированный менеджер экономики
        if (!this.economyManager.hasEnough(GameConfig.CURRENCY.COINS, cost)) { //[cite: 45]
            Logger.debug('UpgradeManager', `Не хватает монет для ${id}`); //[cite: 45]
            return false;
        }
        
        if (!this.economyManager.spendCurrency(GameConfig.CURRENCY.COINS, cost, `upgrade_${id}`)) { //[cite: 45]
            return false;
        }

        const newLevel = Math.min(current + levels, upgrade.maxLevel); //[cite: 45]
        this.purchased.set(id, newLevel); //[cite: 45]
        
        // Применяем изменения
        upgrade.applyEffect(newLevel, this.economyManager); //[cite: 45]
        
        gameEventBus.emit('upgrade_purchased', { id, newLevel, cost }); //[cite: 45]
        Logger.info('UpgradeManager', `Куплено улучшение ${id} до уровня ${newLevel}`); //[cite: 45]
        return true;
    }

    /**
     * Получить все улучшения по категории
     */
    getByCategory(category) {
        const result = []; //[cite: 45]
        for (const [id, upgrade] of this.upgrades) { //[cite: 45]
            if (upgrade.category === category) { //[cite: 45]
                result.push(upgrade); //[cite: 45]
            }
        }
        return result; //[cite: 45]
    }

    // --- Логика Сохранения / Загрузки ---

    getSaveData() {
        const data = {}; //[cite: 45]
        for (const [id, level] of this.purchased) { //[cite: 45]
            if (level > 0) data[id] = level; //[cite: 45]
        }
        return data; //[cite: 45]
    }

    loadSaveData(data) {
        if (!data) return; //[cite: 45]
        for (const [id, level] of Object.entries(data)) { //[cite: 45]
            if (this.purchased.has(id)) { //[cite: 45]
                this.purchased.set(id, level); //[cite: 45]
            }
        }
        this.applyAllEffects(); //[cite: 45]
        Logger.info('UpgradeManager', 'Данные улучшений загружены'); //[cite: 45]
    }
}

/**
 * Класс Upgrade – представление сущности одного улучшения
 */
class Upgrade {
    constructor(tpl) {
        this.id = tpl.id; //[cite: 45]
        this.name = tpl.name; //[cite: 45]
        this.description = tpl.description; //[cite: 45]
        this.category = tpl.category; //[cite: 45]
        this.baseCost = tpl.baseCost; //[cite: 45]
        this.maxLevel = tpl.maxLevel || 50; //[cite: 45]
        this.costMultiplier = tpl.costMultiplier || 1.15; //[cite: 45]
        this.effect = tpl.effect; //[cite: 45]
        this.icon = tpl.icon || ''; //[cite: 45]
    }

    /**
     * Применить эффект к экономике
     * @param {number} level
     * @param {EconomyManager} economyManager
     */
    applyEffect(level, economyManager) {
        if (level <= 0 || !economyManager) return; //[cite: 45]
        const bonus = this.effect(level); //[cite: 45]

        if (bonus.speedMultiplier) {
            gameEventBus.emit('modifier_speed', bonus.speedMultiplier); //[cite: 45]
        }
        if (bonus.incomeMultiplier) {
            economyManager.setGlobalMultiplier('income', economyManager.globalMultipliers.income * bonus.incomeMultiplier); //[cite: 45]
        }
        if (bonus.costDiscount) {
            economyManager.setGlobalMultiplier('costDiscount', economyManager.globalMultipliers.costDiscount * bonus.costDiscount); //[cite: 45]
        }
        if (bonus.energyMultiplier) {
            gameEventBus.emit('modifier_energy', bonus.energyMultiplier); //[cite: 45]
        }
        if (bonus.rarityBoost) {
            // Зарезервировано под CollectionManager[cite: 45]
        }
        if (bonus.luckBoost) {
            // Зарезервировано под EventManager[cite: 45]
        }
        if (bonus.efficiencyMultiplier) {
            // Зарезервировано под FactoryManager[cite: 45]
        }
        if (bonus.automationLevel) {
            // Зарезервировано под FactoryManager[cite: 45]
        }
    }
}