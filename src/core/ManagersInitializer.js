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
        registry.register('sdk', yandexSDK);
        
        // Создаём и регистрируем менеджеры
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
        registry.register('factory', new FactoryManager());
        
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
}

// Авто-регистрация при загрузке скрипта
if (typeof window !== 'undefined' && window.ManagerRegistry) {
    window.ManagersInitializer = ManagersInitializer;
}
