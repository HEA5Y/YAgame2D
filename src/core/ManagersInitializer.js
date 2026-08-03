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
        registry.register('eventBus', gameEventBus); // ← экземпляр, не класс
        registry.register('canvas', window.CanvasManager); // ← добавлен CanvasManager
        
        if (window.yandexSDK) {
            registry.register('sdk', window.yandexSDK);
        } else {
            console.warn('[ManagersInitializer] Yandex SDK не инициализирован');
            registry.register('sdk', null);
        }
        
        // Создаём базовые менеджеры первыми (другие зависят от них)
        const saveManager = new SaveManager();
        registry.register('save', saveManager);
        
        const timeManager = new TimeManager();
        registry.register('time', timeManager);
        
        const economyManager = new EconomyManager(saveManager);
        registry.register('economy', economyManager);
        
        const prestigeManager = new PrestigeManager(economyManager, saveManager);
        registry.register('prestige', prestigeManager);
        
        // Менеджеры без зависимостей в конструкторе
        registry.register('audio', new AudioManager());
        registry.register('asset', new AssetManager());
        registry.register('resource', new ResourceManager());
        registry.register('objectPool', new ObjectPoolManager());
        registry.register('tween', new TweenManager());
        registry.register('particle', new ParticleManager());
        registry.register('juice', new JuiceManager());
        registry.register('ui', new UIManager());
        registry.register('scene', new SceneManager(null)); // game назначается позже
        
        // Менеджеры с зависимостями от save / economy
        registry.register('upgrade', new UpgradeManager(saveManager, economyManager));
        registry.register('achievement', new AchievementManager(saveManager));
        registry.register('quest', new QuestManager(saveManager));
        registry.register('event', new EventManager());
        registry.register('offline', new OfflineManager());
        
        // Менеджеры удержания и монетизации
        registry.register('collection', new CollectionManager());
        registry.register('battlePass', new BattlePassManager());
        registry.register('dailyRewards', new DailyRewardsManager());
        registry.register('chest', new ChestManager());
        
        // Заглушки для недостающих менеджеров (чтобы не ломался initOrder в реестре)
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
        
        // Передаём зависимости в OfflineManager, если он поддерживает
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