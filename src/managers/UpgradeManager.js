/**
 * UpgradeManager.js
 * Управляет всеми улучшениями (до 300+).
 * Регистрируется в SaveManager.
 */

class UpgradeManager {
    /**
     * @param {SaveManager} saveManager
     */
    constructor(saveManager) {
        this.upgrades = new Map(); // id -> Upgrade объект
        this.purchased = new Map(); // id -> текущий уровень
        this.saveManager = saveManager;
        if (saveManager) saveManager.registerSubsystem('upgrades', this);
        this.initUpgrades();
        this.applyAllEffects();
        this.subscribeEvents();
    }

    initUpgrades() {
        // Используем данные из UpgradeData
        UpgradeData.forEach(tpl => {
            const upgrade = new Upgrade(tpl);
            this.upgrades.set(upgrade.id, upgrade);
            this.purchased.set(upgrade.id, 0);
        });
        Logger.info('UpgradeManager', `Загружено ${this.upgrades.size} улучшений`);
    }

    subscribeEvents() {
        // Подписка на события для применения эффектов при покупке
        gameEventBus.on('upgrade_purchased', (data) => {
            const upgrade = this.upgrades.get(data.id);
            if (upgrade) {
                upgrade.applyEffect(data.newLevel);
            }
        });
    }

    /**
     * Применяет эффекты всех купленных улучшений
     */
    applyAllEffects() {
        for (const [id, level] of this.purchased) {
            if (level > 0) {
                const upgrade = this.upgrades.get(id);
                if (upgrade) upgrade.applyEffect(level);
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
        // cost = baseCost * costMultiplier^(current) + ... за каждый уровень
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
        const econ = window.gameInstance.managers.economy;
        if (!econ.hasEnough(GameConfig.CURRENCY.COINS, cost)) {
            Logger.debug('UpgradeManager', `Не хватает монет для ${id}`);
            return false;
        }
        if (!econ.spendCurrency(GameConfig.CURRENCY.COINS, cost, `upgrade_${id}`)) {
            return false;
        }

        const newLevel = Math.min(current + levels, upgrade.maxLevel);
        this.purchased.set(id, newLevel);
        // Применяем эффект
        upgrade.applyEffect(newLevel);
        gameEventBus.emit('upgrade_purchased', { id, newLevel, cost });
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

    // --- Сохранение ---

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
        this.applyAllEffects();
        Logger.info('UpgradeManager', 'Данные улучшений загружены');
    }
}

/**
 * Класс Upgrade – представление одного улучшения
 */
class Upgrade {
    /**
     * @param {Object} tpl - шаблон из UpgradeData
     */
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
     */
    applyEffect(level) {
        if (level <= 0) return;
        const bonus = this.effect(level);
        const econ = window.gameInstance.managers.economy;

        if (bonus.speedMultiplier) {
            // Множитель скорости передаётся через EventBus (обрабатывается FactoryManager)
            gameEventBus.emit('modifier_speed', bonus.speedMultiplier);
        }
        if (bonus.incomeMultiplier) {
            econ.setGlobalMultiplier('income', econ.globalMultipliers.income * bonus.incomeMultiplier);
        }
        if (bonus.costDiscount) {
            econ.setGlobalMultiplier('costDiscount', econ.globalMultipliers.costDiscount * bonus.costDiscount);
        }
        if (bonus.energyMultiplier) {
            // для FactoryManager
            gameEventBus.emit('modifier_energy', bonus.energyMultiplier);
        }
        if (bonus.rarityBoost) {
            // для CollectionManager
        }
        if (bonus.luckBoost) {
            // для EventManager
        }
        if (bonus.efficiencyMultiplier) {
            // для FactoryManager
        }
        if (bonus.automationLevel) {
            // для FactoryManager – уровень автоматизации
        }
        // и т.д.
    }
}