/**
 * Класс EconomyManager
 * Управляет всеми валютами игрока и предоставляет математические формулы для расчета цен.
 */
class EconomyManager {
    /**
     * @param {SaveManager} saveManager Ссылка на менеджер сохранений
     */
    constructor(saveManager) {
        // Инициализация кошельков с использованием BigNumber
        this.wallets = {
            [GameConfig.CURRENCY.COINS]: new BigNumber(EconomyData.STARTING_BALANCES.coins),
            [GameConfig.CURRENCY.GEMS]: new BigNumber(EconomyData.STARTING_BALANCES.gems),
            [GameConfig.CURRENCY.BRAIN_CELLS]: new BigNumber(EconomyData.STARTING_BALANCES.brain_cells),
            [GameConfig.CURRENCY.RESEARCH_POINTS]: new BigNumber(EconomyData.STARTING_BALANCES.research)
        };

        // Глобальные множители (от престижа, рекламы, доната)
        this.globalMultipliers = {
            income: 1.0,
            costDiscount: 1.0,
            timeSpeed: 1.0
        };

        // Регистрация в подсистеме сохранений
        if (saveManager) {
            saveManager.registerSubsystem('economy', this);
        }
    }

    // --- Управление валютами ---

    /**
     * Получить текущий баланс валюты
     * @param {string} currencyId ID валюты из GameConfig.CURRENCY
     * @returns {BigNumber} Копия объекта BigNumber
     */
    getBalance(currencyId) {
        if (!this.wallets[currencyId]) {
            Logger.error('EconomyManager', `Запрошен баланс неизвестной валюты: ${currencyId}`);
            return new BigNumber(0);
        }
        return this.wallets[currencyId].clone();
    }

    /**
     * Проверка, хватает ли валюты для покупки
     * @param {string} currencyId ID валюты
     * @param {BigNumber|number|string} amount Необходимая сумма
     * @returns {boolean}
     */
    hasEnough(currencyId, amount) {
        const required = new BigNumber(amount);
        return this.wallets[currencyId].isGreaterThanOrEqualTo(required);
    }

    /**
     * Добавление валюты (доход)
     */
    addCurrency(currencyId, amount, source = 'unknown') {
        const valueToAdd = new BigNumber(amount);
        if (valueToAdd.isLessThanOrEqualTo(0)) return;

        this.wallets[currencyId] = this.wallets[currencyId].add(valueToAdd);
        
        // Оповещаем UI и другие системы
        gameEventBus.emit(GameConfig.EVENTS.CURRENCY_CHANGED, {
            currency: currencyId,
            newValue: this.wallets[currencyId].clone(),
            delta: valueToAdd,
            source: source
        });
    }

    /**
     * Списание валюты (покупка)
     */
    spendCurrency(currencyId, amount, source = 'purchase') {
        const valueToSpend = new BigNumber(amount);
        
        if (!this.hasEnough(currencyId, valueToSpend)) {
            Logger.warn('EconomyManager', `Попытка списать больше чем есть! Валюта: ${currencyId}, Источник: ${source}`);
            return false;
        }

        this.wallets[currencyId] = this.wallets[currencyId].subtract(valueToSpend);
        
        gameEventBus.emit(GameConfig.EVENTS.CURRENCY_CHANGED, {
            currency: currencyId,
            newValue: this.wallets[currencyId].clone(),
            delta: new BigNumber(valueToSpend.mantissa * -1), // Отрицательная дельта
            source: source
        });

        return true;
    }

    // --- Математика стоимости и уровней ---

    /**
     * Рассчитывает стоимость следующего уровня.
     * Формула: BaseCost * (Multiplier ^ CurrentLevel) * Discount
     */
    calculateUpgradeCost(baseCost, currentLevel, multiplier = EconomyData.PROGRESSION.DEFAULT_COST_MULTIPLIER) {
        const base = new BigNumber(baseCost);
        const power = Math.pow(multiplier, currentLevel); // Для огромных уровней потребуется BigNumber.pow, но до 1000 уровней Math.pow(1.15, 1000) = 4.3e60 работает корректно в JS
        
        let rawCost = base.multiply(power);
        
        // Применяем глобальную скидку (исследования / артефакты)
        if (this.globalMultipliers.costDiscount < 1.0) {
            rawCost = rawCost.multiply(this.globalMultipliers.costDiscount);
        }

        return rawCost;
    }

    /**
     * Рассчитывает суммарную стоимость покупки N уровней сразу
     * Используется формула суммы геометрической прогрессии:
     * Sum = BaseCost * (Multiplier^CurrentLevel) * ( (Multiplier^N - 1) / (Multiplier - 1) )
     */
    calculateBulkUpgradeCost(baseCost, currentLevel, levelsToBuy, multiplier = EconomyData.PROGRESSION.DEFAULT_COST_MULTIPLIER) {
        if (levelsToBuy <= 1) return this.calculateUpgradeCost(baseCost, currentLevel, multiplier);

        const currentCost = this.calculateUpgradeCost(baseCost, currentLevel, multiplier);
        const ratioPower = Math.pow(multiplier, levelsToBuy);
        
        // sumFactor = (r^n - 1) / (r - 1)
        const sumFactor = (ratioPower - 1) / (multiplier - 1);

        return currentCost.multiply(sumFactor);
    }

    /**
     * Установка глобальных модификаторов
     */
    setGlobalMultiplier(key, value) {
        if (this.globalMultipliers[key] !== undefined) {
            this.globalMultipliers[key] = value;
        }
    }

    getIncomeMultiplier() {
        return this.globalMultipliers.income;
    }

    // --- Сохранение и загрузка ---

    getSaveData() {
        return {
            coins: { m: this.wallets.coins.mantissa, e: this.wallets.coins.exponent },
            gems: { m: this.wallets.gems.mantissa, e: this.wallets.gems.exponent },
            brain_cells: { m: this.wallets.brain_cells.mantissa, e: this.wallets.brain_cells.exponent },
            research: { m: this.wallets.research.mantissa, e: this.wallets.research.exponent }
        };
    }

    loadSaveData(data) {
        if (!data) return;

        // Восстановление BigNumber из сохраненной мантиссы и экспоненты
        if (data.coins) {
            this.wallets.coins.mantissa = data.coins.m;
            this.wallets.coins.exponent = data.coins.e;
        }
        if (data.gems) {
            this.wallets.gems.mantissa = data.gems.m;
            this.wallets.gems.exponent = data.gems.e;
        }
        if (data.brain_cells) {
            this.wallets.brain_cells.mantissa = data.brain_cells.m;
            this.wallets.brain_cells.exponent = data.brain_cells.e;
        }
        if (data.research) {
            this.wallets.research.mantissa = data.research.m;
            this.wallets.research.exponent = data.research.e;
        }
    }
}