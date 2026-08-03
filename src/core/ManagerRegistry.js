/**
 * ManagerRegistry - Централизованный реестр менеджеров
 * Устраняет жесткие зависимости между менеджерами (Service Locator pattern)
 */
class ManagerRegistry {
    constructor() {
        this.managers = new Map();
        this.initialized = false;
    }

    register(name, manager) {
        if (this.managers.has(name)) {
            Logger.warn(`Manager ${name} already registered. Overwriting.`);
        }
        this.managers.set(name, manager);
        return manager;
    }

    get(name) {
        const manager = this.managers.get(name);
        if (!manager) {
            Logger.error(`Manager ${name} not found in registry!`);
            return null;
        }
        return manager;
    }

    /**
     * Получить все зарегистрированные менеджеры
     * @returns {Object} Объект с парами { имя: менеджер }
     */
    getAll() {
        const result = {};
        for (const [name, manager] of this.managers.entries()) {
            if (manager) {
                result[name] = manager;
            }
        }
        return result;
    }

    has(name) {
        return this.managers.has(name);
    }

    count() {
        return this.managers.size;
    }

    async initializeAll() {
        Logger.info('Initializing all managers...');
        
        // Порядок инициализации важен: сначала базовые, потом зависимые
        const initOrder = [
            'config', 'logger', 'eventBus', 'sdk', 
            'audio', 'asset', 'save', 'time', 'resource', 
            'economy', 'factory', 'upgrade', 'collection',
            'quest', 'achievement', 'battlePass', 'dailyRewards',
            'chest', 'prestige', 'world', 'pet', 'booster',
            'particle', 'tween', 'juice', 'ui', 'offline'
        ];

        for (const name of initOrder) {
            const manager = this.get(name);
            if (manager && typeof manager.init === 'function') {
                try {
                    await manager.init();
                    Logger.debug(`Manager ${name} initialized`);
                } catch (error) {
                    Logger.error(`Failed to initialize ${name}:`, error);
                }
            }
        }
        
        this.initialized = true;
        Logger.info('All managers initialized successfully');
    }

    updateAll(deltaTime) {
        if (!this.initialized) return;

        // Обновляем только активные менеджеры
        const activeManagers = ['time', 'factory', 'quest', 'battlePass', 'dailyRewards', 'chest', 'booster', 'pet', 'offline'];
        
        for (const name of activeManagers) {
            const manager = this.managers.get(name); // Прямой доступ к Map, без проверки через get()
            if (manager && typeof manager.update === 'function') {
                try {
                    manager.update(deltaTime);
                } catch (error) {
                    console.error(`❌ Update error in ${name}:`, error);
                }
            }
        }
    }

    renderAll(ctx) {
        if (!this.initialized || !ctx) return;

        const renderOrder = ['world', 'factory', 'pet', 'particle', 'ui'];
        
        for (const name of renderOrder) {
            const manager = this.managers.get(name); // Прямой доступ к Map, без проверки через get()
            if (manager && typeof manager.render === 'function') {
                try {
                    manager.render(ctx);
                } catch (error) {
                    console.error(`❌ Render error in ${name}:`, error);
                }
            }
        }
    }

    destroyAll() {
        Logger.info('Destroying all managers...');
        for (const [name, manager] of this.managers.entries()) {
            if (typeof manager.destroy === 'function') {
                try {
                    manager.destroy();
                    Logger.debug(`Manager ${name} destroyed`);
                } catch (error) {
                    Logger.error(`Error destroying ${name}:`, error);
                }
            }
        }
        this.managers.clear();
        this.initialized = false;
    }
}

// Глобальный экземпляр (единственная точка доступа)
window.ManagerRegistry = new ManagerRegistry();