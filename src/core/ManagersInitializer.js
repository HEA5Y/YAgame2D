/**
 * ManagersInitializer - Регистрация всех менеджеров в ManagerRegistry
 * Вызывается один раз при старте игры
 */
class ManagersInitializer {
    static init() {
        const registry = window.ManagerRegistry;
        
        // Базовые сервисы (уже созданы как синглтоны)
        registry.register('config', GameConfig);
        registry.register('logger', Logger);
        registry.register('eventBus', EventBus);
        if (window.yandexSDK) {
            registry.register('sdk', window.yandexSDK);
        } else {
            console.warn('[ManagersInitializer] Yandex SDK не инициализирован');
            registry.register('sdk', null);
        }
        
        // Создаём и регистрируем менеджеры (без зависимостей в конструкторе)
        registry.register('audio', new AudioManager());
        registry.register('asset', new AssetManager());
        registry.register('save', new SaveManager());
        registry.register('time', new TimeManager());
        registry.register('resource', new ResourceManager());
        registry.register('objectPool', new ObjectPoolManager());
        registry.register('economy', new EconomyManager());
        registry.register('prestige', new PrestigeManager());
        registry.register('ui', new UIManager());
        registry.register('scene', new SceneManager());
        
        // Дополнительные менеджеры
        registry.register('upgrade', new UpgradeManager());
        registry.register('achievement', new AchievementManager());
        registry.register('quest', new QuestManager());
        registry.register('event', new EventManager());
        registry.register('offline', new OfflineManager());
        registry.register('tween', new TweenManager());
        registry.register('particle', new ParticleManager());
        
        // FactoryManager создаётся позже, после установки зависимостей
        // registry.register('factory', new FactoryManager()); // Отложено
        
        // Менеджеры удержания и монетизации
        registry.register('collection', new CollectionManager());
        registry.register('battlePass', new BattlePassManager());
        registry.register('dailyRewards', new DailyRewardsManager());
        registry.register('chest', new ChestManager());
        registry.register('juice', new JuiceManager());
        
        // Заглушки для недостающих менеджеров (чтобы не ломался initOrder)
        registry.register('world', {
            init: () => {},
            update: () => {},
            render: () => {}
        });
        registry.register('pet', {
            init: () => {},
            update: () => {},
            render: () => {}
        });
        registry.register('booster', {
            init: () => {},
            update: () => {}
        });
        
        console.log('[ManagersInitializer] Все менеджеры зарегистрированы:', registry.count());
    }
    
    /**
     * Инициализация менеджеров с зависимостями
     * Вызывается после регистрации всех базовых менеджеров
     */
    static initDependentManagers() {
        const registry = window.ManagerRegistry;
        
        // Получаем зависимости для FactoryManager
        const economyManager = registry.get('economy');
        const saveManager = registry.get('save');
        
        // Создаём и регистрируем FactoryManager с зависимостями
        const factoryManager = new FactoryManager(economyManager, saveManager);
        registry.register('factory', factoryManager);
        
        // Передаём зависимости в другие менеджеры, если нужно
        const offlineManager = registry.get('offline');
        if (offlineManager && typeof offlineManager.setDependencies === 'function') {
            offlineManager.setDependencies(factoryManager, economyManager);
        }
        
        console.log('[ManagersInitializer] Зависимые менеджеры инициализированы');
    }
}

// Авто-регистрация при загрузке скрипта
if (typeof window !== 'undefined' && window.ManagerRegistry) {
    window.ManagersInitializer = ManagersInitializer;
}
