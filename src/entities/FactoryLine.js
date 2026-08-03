/**
 * Класс FactoryLine
 * Управляет отдельной производственной линией фабрики (производство, таймеры, уровни, автоматизация).
 */
class FactoryLine {
    /**
     * @param {string} id Уникальный ID линии
     * @param {Object} config Конфигурация из EconomyData
     * @param {EconomyManager} economyManager Менеджер экономики
     */
    constructor(id, config, economyManager) {
        this.id = id;
        this.name = config.name;
        this.baseCost = new BigNumber(config.baseCost);
        this.baseProduction = new BigNumber(config.baseProduction);
        this.productionTimeBase = config.productionTimeBase;
        this.costMultiplier = config.costMultiplier;
        
        this.economyManager = economyManager;

        // Состояние линии
        this.level = 0; // 0 означает не куплена / не открыта
        this.unlocked = false;
        this.progress = 0; // От 0 до 1 (100%)
        this.automated = false; // Автоматический сбор без клика игрока
        
        // Рабочие на линии
        this.workersCount = 0;
        this.maxWorkers = 5;

        // Множители
        this.speedMultiplier = 1.0;
        this.productionMultiplier = 1.0;
    }

    /**
     * Проверка, может ли игрок купить следующий уровень
     */
    getUpgradeCost(levels = 1) {
        return this.economyManager.calculateBulkUpgradeCost(
            this.baseCost, 
            this.level, 
            levels, 
            this.costMultiplier
        );
    }

    /**
     * Покупка уровня или разблокировка линии
     */
    upgrade(levels = 1) {
        const cost = this.getUpgradeCost(levels);
        
        if (!this.economyManager.hasEnough(GameConfig.CURRENCY.COINS, cost)) {
            Logger.debug('FactoryLine', `Не хватает монет для улучшения ${this.id}`);
            return false;
        }

        if (this.economyManager.spendCurrency(GameConfig.CURRENCY.COINS, cost, `upgrade_${this.id}`)) {
            this.level += levels;
            if (!this.unlocked) {
                this.unlocked = true;
                gameEventBus.emit(GameConfig.EVENTS.FACTORY_LINE_UNLOCKED, { lineId: this.id });
            }
            
            gameEventBus.emit(GameConfig.EVENTS.UPGRADE_BOUGHT, { lineId: this.id, newLevel: this.level });
            Logger.info('FactoryLine', `Линия ${this.id} улучшена до уровня ${this.level}`);
            return true;
        }

        return false;
    }

    /**
     * Расчет текущей производительности (доход в секунду / за цикл)
     */
    getProductionOutput() {
        if (this.level === 0) return new BigNumber(0);
        
        // Формула: BaseProduction * Level * Multipliers
        const base = this.baseProduction.clone();
        const levelFactor = new BigNumber(this.level);
        let output = base.multiply(levelFactor);
        
        // Глобальный бонус экономики
        const globalInc = this.economyManager.getIncomeMultiplier();
        output = output.multiply(globalInc);
        output = output.multiply(this.productionMultiplier);

        return output;
    }

    /**
     * Расчет времени производства с учетом скорости
     */
    getProductionTime() {
        let time = this.productionTimeBase / (this.speedMultiplier * Math.max(1, this.workersCount * 0.5));
        return Math.max(0.1, time); // Минимальное время 0.1 сек
    }

    /**
     * Обновление состояния линии (вызывается каждый кадр)
     * @param {number} dt Delta time в секундах
     */
    update(dt) {
        if (!this.unlocked || this.level === 0) return;

        // Скорость заполнения прогресс-бара
        const prodTime = this.getProductionTime();
        const speedFactor = dt / prodTime;
        
        this.progress += speedFactor;

        // Если цикл производства завершен
        if (this.progress >= 1.0) {
            this.progress = 0; // Сброс шкалы
            this.completeProduction();
        }
    }

    /**
     * Завершение производственного цикла
     */
    completeProduction() {
        const output = this.getProductionOutput();
        
        if (this.automated) {
            // Если автоматизировано, сразу добавляем в кошелек
            this.economyManager.addCurrency(GameConfig.CURRENCY.COINS, output, `factory_${this.id}`);
            gameEventBus.emit(GameConfig.EVENTS.RESOURCE_PRODUCED, { lineId: this.id, amount: output });
        } else {
            // Если не автоматизировано, ресурс ждет ручного клика (складывается во внутренний буфер)
            this.pendingCollection = (this.pendingCollection || new BigNumber(0)).add(output);
        }
    }

    /**
     * Ручной сбор ресурсов игроком (когда линия не автоматизирована)
     */
    collectManual() {
        if (!this.pendingCollection || this.pendingCollection.isEqualTo(0)) return;
        
        const amount = this.pendingCollection.clone();
        this.pendingCollection = new BigNumber(0);
        
        this.economyManager.addCurrency(GameConfig.CURRENCY.COINS, amount, `manual_collect_${this.id}`);
        return amount;
    }

    // Сохранение и загрузка
    getSaveData() {
        return {
            level: this.level,
            unlocked: this.unlocked,
            automated: this.automated,
            workersCount: this.workersCount,
            pending: this.pendingCollection ? { m: this.pendingCollection.mantissa, e: this.pendingCollection.exponent } : null
        };
    }

    loadSaveData(data) {
        if (!data) return;
        this.level = data.level || 0;
        this.unlocked = data.unlocked || false;
        this.automated = data.automated || false;
        this.workersCount = data.workersCount || 0;
        if (data.pending) {
            this.pendingCollection = new BigNumber(0);
            this.pendingCollection.mantissa = data.pending.m;
            this.pendingCollection.exponent = data.pending.e;
        }
    }
}