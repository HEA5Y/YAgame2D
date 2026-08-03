/**
 * Глобальная конфигурация игры.
 * Исключает магические числа из логики.
 */
const GameConfig = {
    // Настройки движка
    ENGINE: {
        TARGET_FPS: 60,
        MAX_DELTA_TIME: 100, // Максимальный шаг (мс), чтобы избежать скачков физики при лагах
        CANVAS_LOGICAL_WIDTH: 1080,
        CANVAS_LOGICAL_HEIGHT: 1920,
        IS_PRODUCTION: false // Переключить в true перед релизом
    },

    // Константы сохранения
    SAVE: {
        LOCAL_STORAGE_KEY: 'BrainrotFactory_SaveData_v1',
        SAVE_INTERVAL_MS: 30000, // Автосохранение каждые 30 секунд
        CLOUD_SAVE_ENABLED: true
    },

    // Конфигурация экономики и математики
    ECONOMY: {
        BASE_COST_MULTIPLIER: 1.15, // Стандартная формула: Cost = BaseCost * (Multiplier ^ Level)
        PRESTIGE_COST_SCALING: 1.50,
        OFFLINE_PRODUCTION_PERCENT: 0.5, // 50% от онлайна при оффлайне без бонусов
        MAX_OFFLINE_HOURS: 24 // Максимум 24 часа оффлайн дохода
    },

    // Внутриигровые события (Ключи для EventBus)
    EVENTS: {
        // Системные
        ENGINE_INIT_COMPLETE: 'engine_init_complete',
        GAME_PAUSE: 'game_pause',
        GAME_RESUME: 'game_resume',
        RESIZE: 'resize',
        
        // SDK
        SDK_READY: 'sdk_ready',
        AD_REWARDED_SHOW: 'ad_rewarded_show',
        AD_REWARDED_CLOSE: 'ad_rewarded_close',
        AD_REWARDED_REWARD: 'ad_rewarded_reward',
        AD_REWARDED_ERROR: 'ad_rewarded_error',
        AD_INTERSTITIAL_SHOW: 'ad_interstitial_show',
        AD_INTERSTITIAL_CLOSE: 'ad_interstitial_close',
        
        // Экономика
        CURRENCY_CHANGED: 'currency_changed',
        RESOURCE_PRODUCED: 'resource_produced',
        PURCHASE_SUCCESS: 'purchase_success',
        PURCHASE_FAILED: 'purchase_failed',
        
        // Прогрессия
        UPGRADE_BOUGHT: 'upgrade_bought',
        RESEARCH_COMPLETED: 'research_completed',
        PRESTIGE_ACTIVATED: 'prestige_activated',
        NEW_CREATURE_UNLOCKED: 'new_creature_unlocked',
        FACTORY_LINE_UNLOCKED: 'factory_line_unlocked',
        
        // UI
        POPUP_OPEN: 'popup_open',
        POPUP_CLOSE: 'popup_close',
        SHOW_NOTIFICATION: 'show_notification',
        
        // Достижения и квесты
        ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
        QUEST_COMPLETED: 'quest_completed'
    },

    // Валюты игры
    CURRENCY: {
        COINS: 'coins',             // Мягкая валюта
        GEMS: 'gems',               // Жесткая валюта (донат)
        BRAIN_CELLS: 'brain_cells', // Валюта престижа
        RESEARCH_POINTS: 'research' // Очки науки
    }
};

// Заморозка конфига, чтобы исключить случайное изменение в рантайме
Object.freeze(GameConfig.ENGINE);
Object.freeze(GameConfig.SAVE);
Object.freeze(GameConfig.ECONOMY);
Object.freeze(GameConfig.EVENTS);
Object.freeze(GameConfig.CURRENCY);