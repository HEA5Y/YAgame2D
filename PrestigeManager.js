/**
 * Класс PrestigeManager
 * Управляет системой престижа (Brain Cells), постоянными бонусами и мульти-престиж слоями.
 * Интегрируется с EconomyManager (начисляет/списывает валюты) и SaveManager (сохраняет прогресс).
 */
class PrestigeManager {
    /**
     * @param {EconomyManager} economyManager
     * @param {SaveManager} saveManager
     */
    constructor(economyManager, saveManager) {
        this.economyManager = economyManager;
        this.saveManager = saveManager;

        // Текущий слой престижа (0 = первый мир, 1 = Reality, 2 = Galaxy...)
        this.prestigeLayer = 0;
        
        // Накопленные Brain Cells (валюта престижа)
        this.brainCells = new BigNumber(0);
        
        // Всего заработано Brain Cells за всё время (для лидербордов и ачивок)
        this.totalBrainCellsEarned = new BigNumber(0);
        
        // Количество выполненных престижей
        this.prestigeCount = 0;
        
        // Дерево постоянных бонусов: ключ -> уровень
        this.permanentBonuses = {
            'income_multiplier': 0,
            'cost_reduction': 0,
            'speed_boost': 0,
            'start_gold': 0,
            'crit_chance': 0,
            'offline_boost': 0
        };

        // Базовые стоимости бонусов в Brain Cells (геометрическая прогрессия)
        this.bonusBaseCosts = {
            'income_multiplier': 10,
            'cost_reduction': 25,
            'speed_boost': 50,
            'start_gold': 100,
            'crit_chance': 500,
            'offline_boost': 250
        };

        // Множители стоимости бонусов
        this.bonusCostMultipliers = {
            'income_multiplier': 1.5,
            'cost_reduction': 1.6,
            'speed_boost': 1.55,
            'start_gold': 2.0,
            'crit_chance': 1.8,
            'offline_boost': 1.7
        };

        // Эффекты бонусов за уровень
        this.bonusEffects = {
            'income_multiplier': 0.10, // +10% за уровень
            'cost_reduction': 0.05,    // -5% стоимости за уровень
            'speed_boost': 0.08,       // +8% скорости за уровень
            'start_gold': 100,         // +100 монет за уровень при престиже
            'crit_chance': 0.01,       // +1% шанс крита за уровень
            'offline_boost': 0.10      // +10% оффлайн дохода за уровень
        };

        // Максимальные уровни бонусов
        this.bonusMaxLevels = {
            'income_multiplier': 100,
            'cost_reduction': 50,
            'speed_boost': 100,
            'start_gold': 50,
            'crit_chance': 25,
            'offline_boost': 50
        };

        if (saveManager) {
            saveManager.registerSubsystem('prestige', this);
        }

        // Применяем сохранённые бонусы к экономике
        this.applyPermanentBonuses();
    }

    /**
     * Рассчитывает, сколько Brain Cells игрок получит при престиже
     * Формула: (log10(totalCoinsEarned) ^ 1.5) * layerMultiplier
     * @returns {BigNumber}
     */
    calculateBrainCellsOnPrestige() {
        const totalCoins = this.economyManager.getBalance(GameConfig.CURRENCY.COINS);
        if (totalCoins.isLessThanOrEqualTo(0)) return new BigNumber(0);
        
        const logVal = Math.log10(totalCoins.toNumber());
        if (logVal <= 0) return new BigNumber(0);
        
        const layerMultiplier = 1 + (this.prestigeLayer * 0.5);
        const rawValue = Math.pow(logVal, 1.5) * layerMultiplier;
        
        return new BigNumber(Math.floor(rawValue));
    }

    /**
     * Проверяет, доступен ли престиж (минимум 1000 монет)
     * @returns {boolean}
     */
    canPrestige() {
        const coins = this.economyManager.getBalance(GameConfig.CURRENCY.COINS);
        return coins.isGreaterThanOrEqualTo(1000);
    }

    /**
     * Активация престижа: сброс прогресса, начисление Brain Cells, применение бонусов
     */
    doPrestige() {
        if (!this.canPrestige()) {
            Logger.warn('PrestigeManager', 'Попытка престижа без достаточного количества монет');
            return false;
        }

        const earned = this.calculateBrainCellsOnPrestige();
        if (earned.isLessThanOrEqualTo(0)) return false;

        // Начисляем Brain Cells
        this.brainCells = this.brainCells.add(earned);
        this.totalBrainCellsEarned = this.totalBrainCellsEarned.add(earned);
        this.prestigeCount++;

        // ИСПРАВЛЕНО: безопасный сброс мягкой валюты через EconomyManager
        const startGold = this.permanentBonuses['start_gold'] * this.bonusEffects['start_gold'];
        this.economyManager.resetCurrency(GameConfig.CURRENCY.COINS, startGold);
        
        // Сброс прогресса фабричных линий через реестр
        const factoryManager = (window.ManagerRegistry) ? window.ManagerRegistry.get('factory') : null;
        if (factoryManager && factoryManager.lines) {
            for (const line of factoryManager.lines.values()) {
                line.level = 0;
                line.unlocked = false;
                line.progress = 0;
                line.pendingCollection = new BigNumber(0);
                line.automated = false;
                line.workersCount = 0;
            }
            Logger.info('PrestigeManager', 'Прогресс фабрики сброшен из-за престижа');
        }
        
        gameEventBus.emit(GameConfig.EVENTS.PRESTIGE_ACTIVATED, {
            layer: this.prestigeLayer,
            brainCellsEarned: earned.clone(),
            totalPrestiges: this.prestigeCount
        });

        // Применяем бонусы к экономике
        this.applyPermanentBonuses();

        Logger.info('PrestigeManager', `Престиж выполнен! Получено ${earned.format()} Brain Cells. Счёт: ${this.prestigeCount}`);
        return true;
    }

    /**
     * Применяет все купленные постоянные бонусы к EconomyManager
     */
    applyPermanentBonuses() {
        if (!this.economyManager) return;

        // Доход
        const incomeBonus = 1 + (this.permanentBonuses['income_multiplier'] * this.bonusEffects['income_multiplier']);
        this.economyManager.setGlobalMultiplier('income', incomeBonus);

        // Скидка на стоимость
        const costDiscount = Math.max(0.01, 1 - (this.permanentBonuses['cost_reduction'] * this.bonusEffects['cost_reduction']));
        this.economyManager.setGlobalMultiplier('costDiscount', costDiscount);

        // Скорость — эмитим modifier_speed (который слушает FactoryManager)
        const speedBonus = 1 + (this.permanentBonuses['speed_boost'] * this.bonusEffects['speed_boost']);
        // ИСПРАВЛЕНО: используем существующее событие modifier_speed
        gameEventBus.emit('modifier_speed', speedBonus);
    }

    /**
     * Покупка бонуса в дереве престижа
     * @param {string} bonusId 
     * @param {number} levels 
     * @returns {boolean}
     */
    buyBonus(bonusId, levels = 1) {
        if (!this.permanentBonuses.hasOwnProperty(bonusId)) return false;
        if (this.permanentBonuses[bonusId] >= this.bonusMaxLevels[bonusId]) return false;

        const currentLevel = this.permanentBonuses[bonusId];
        const maxBuyable = Math.min(levels, this.bonusMaxLevels[bonusId] - currentLevel);
        
        // Суммарная стоимость
        let totalCost = new BigNumber(0);
        for (let i = 0; i < maxBuyable; i++) {
            const levelCost = this.bonusBaseCosts[bonusId] * Math.pow(this.bonusCostMultipliers[bonusId], currentLevel + i);
            totalCost = totalCost.add(new BigNumber(levelCost));
        }

        if (this.brainCells.isLessThan(totalCost)) return false;

        this.brainCells = this.brainCells.subtract(totalCost);
        this.permanentBonuses[bonusId] += maxBuyable;
        
        this.applyPermanentBonuses();

        gameEventBus.emit('prestige_bonus_bought', { 
            bonusId, 
            newLevel: this.permanentBonuses[bonusId],
            cost: totalCost 
        });

        Logger.info('PrestigeManager', `Куплен бонус ${bonusId} (+${maxBuyable} ур). Текущий: ${this.permanentBonuses[bonusId]}`);
        return true;
    }

    /**
     * Получить стоимость следующего уровня бонуса
     */
    getBonusCost(bonusId, levels = 1) {
        const currentLevel = this.permanentBonuses[bonusId] || 0;
        let totalCost = new BigNumber(0);
        for (let i = 0; i < levels; i++) {
            const levelCost = this.bonusBaseCosts[bonusId] * Math.pow(this.bonusCostMultipliers[bonusId], currentLevel + i);
            totalCost = totalCost.add(new BigNumber(levelCost));
        }
        return totalCost;
    }

    /**
     * Получить текущий эффект бонуса (например, 2.5x доход)
     */
    getBonusEffectValue(bonusId) {
        const level = this.permanentBonuses[bonusId] || 0;
        return level * this.bonusEffects[bonusId];
    }

    // --- Сохранение и загрузка ---

    getSaveData() {
        return {
            prestigeLayer: this.prestigeLayer,
            brainCells: { m: this.brainCells.mantissa, e: this.brainCells.exponent },
            totalBrainCellsEarned: { m: this.totalBrainCellsEarned.mantissa, e: this.totalBrainCellsEarned.exponent },
            prestigeCount: this.prestigeCount,
            permanentBonuses: { ...this.permanentBonuses }
        };
    }

    loadSaveData(data) {
        if (!data) return;
        
        this.prestigeLayer = data.prestigeLayer || 0;
        this.prestigeCount = data.prestigeCount || 0;
        
        if (data.brainCells) {
            this.brainCells = new BigNumber(0);
            this.brainCells.mantissa = data.brainCells.m;
            this.brainCells.exponent = data.brainCells.e;
            this.brainCells.normalize();
        }
        if (data.totalBrainCellsEarned) {
            this.totalBrainCellsEarned = new BigNumber(0);
            this.totalBrainCellsEarned.mantissa = data.totalBrainCellsEarned.m;
            this.totalBrainCellsEarned.exponent = data.totalBrainCellsEarned.e;
            this.totalBrainCellsEarned.normalize();
        }
        if (data.permanentBonuses) {
            Object.assign(this.permanentBonuses, data.permanentBonuses);
        }
        
        this.applyPermanentBonuses();
        Logger.info('PrestigeManager', 'Данные престижа загружены');
    }
}