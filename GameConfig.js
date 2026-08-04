/**
 * Глобальная конфигурация игры.
 * Исключает магические числа из логики.
 */
const GameConfig = {
    // Версия сохранения (для миграции)
    SAVE_VERSION: '1.0.0',
    
    // Настройки движка
    ENGINE: {
        TARGET_FPS: 60,
        FRAME_TIME: 1000 / 60,
        MAX_DELTA_TIME: 100, // Максимальный шаг (мс), чтобы избежать скачков физики при лагах
        CANVAS_LOGICAL_WIDTH: 1920,
        CANVAS_LOGICAL_HEIGHT: 1080,
        MIN_SCALE: 0.5,
        MAX_SCALE: 2.0,
        IS_PRODUCTION: false // Переключить в true перед релизом
    },

    // Константы сохранения
    SAVE: {
        LOCAL_STORAGE_KEY: 'BrainrotFactory_SaveData_v1',
        SAVE_INTERVAL_MS: 30000, // Автосохранение каждые 30 секунд
        CLOUD_SAVE_ENABLED: true,
        BACKUP_ENABLED: true
    },

    // Конфигурация экономики и математики
    ECONOMY: {
        BASE_PRODUCTION_RATE: 1,
        BASE_COST_MULTIPLIER: 1.15, // Стандартная формула: Cost = BaseCost * (Multiplier ^ Level)
        BASE_UPGRADE_COST: 10,
        PRESTIGE_COST_SCALING: 1.50,
        PRESTIGE_MULTIPLIER: 1.5,
        OFFLINE_PRODUCTION_PERCENT: 0.5, // 50% от онлайна при оффлайне без бонусов
        MAX_OFFLINE_HOURS: 24, // Максимум 24 часа оффлайн дохода
        OFFLINE_INCOME_CAP: 7200000, // 2 часа в мс
        OFFLINE_INCOME_PENALTY: 0.5 // 50% эффективности
    },
    
    // Редкости существ (веса для гачи)
    RARITY_WEIGHTS: {
        common: 5000,      // 50%
        rare: 3000,        // 30%
        epic: 1500,        // 15%
        legendary: 400,    // 4%
        mythic: 90,        // 0.9%
        divine: 9,         // 0.09%
        secret: 1          // 0.01%
    },
    
    RARITY_COLORS: {
        common: '#9ca3af',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
        mythic: '#ef4444',
        divine: '#ec4899',
        secret: '#10b981'
    },
    
    // Боевой пропуск
    BATTLE_PASS: {
        LEVELS: 50,
        SEASON_DAYS: 30
    },
    
    // Ежедневные награды
    DAILY_REWARDS: {
        DAYS: 30,
        QUESTS_COUNT: 3
    },
    
    // Сундуки
    CHEST_TYPES: {
        common: { timer: 0, color: '#9ca3af' },
        uncommon: { timer: 30, color: '#22c55e' },
        rare: { timer: 60, color: '#3b82f6' },
        epic: { timer: 120, color: '#a855f7' },
        legendary: { timer: 180, color: '#f59e0b' },
        divine: { timer: 240, color: '#ec4899' }
    },
    
    CHEST_RESPAWN_TIME: 600, // 10 минут
    
    // Комбо система
    COMBO: {
        WINDOW: 3000, // 3 секунды между кликами для комбо
        MAX_STACK: 10,
        BONUS_PER_STACK: 0.1 // +10% за каждый стек
    },
    
    // Критическое производство
    CRIT: {
        CHANCE: 0.1, // 10%
        MULTIPLIER: 3
    },
    
    // Juice эффекты
    JUICE: {
        SHAKE_INTENSITY: 10,
        SHAKE_DURATION: 300,
        FLASH_DURATION: 200
    },
    
    // Реклама
    ADS: {
        COOLDOWN: 30000, // 30 секунд между рекламами
        REWARD_MULTIPLIER: 2,
        INTERSTITIAL_MIN_INTERVAL: 180000 // 3 минуты между interstitial
    },
    
    // Звук
    AUDIO: {
        MAX_SIMULTANEOUS_SOUNDS: 10,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.7
    },
    
    // UI
    UI: {
        UPDATE_INTERVAL: 100, // Обновлять UI каждые 100мс, не каждый кадр
        DIRTY_FLAG_TIMEOUT: 50
    },
    
    // Этапы загрузки
    LOADING_STEPS: {
        INIT: 0,
        SDK: 10,
        MANAGERS: 20,
        RESOURCES: 30,
        SAVE: 50,
        READY: 80,
        COMPLETE: 100
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
        QUEST_COMPLETED: 'quest_completed',
        
        // Аналитика
        TUTORIAL_COMPLETE: 'tutorial_complete',
        FACTORY_UPGRADE: 'factory_upgrade',
        WATCH_AD: 'watch_ad',
        LEVEL_UP: 'level_up',
        SESSION_START: 'session_start',
        SESSION_END: 'session_end',
        PURCHASE: 'purchase',
        CHEST_OPEN: 'chest_open',
        GACHA_PULL: 'gacha_pull'
    },

    // Валюты игры
    CURRENCY: {
        COINS: 'coins',             // Мягкая валюта
        GEMS: 'gems',               // Жесткая валюта (донат)
        BRAIN_CELLS: 'brain_cells', // Валюта престижа
        RESEARCH_POINTS: 'research' // Очки науки
    },
    
    // Миры/Эпохи
    WORLDS: [
        { id: 0, name: 'Brainrot Factory', unlockPrestige: 0 },
        { id: 1, name: 'Italy Factory', unlockPrestige: 1 },
        { id: 2, name: 'Space Factory', unlockPrestige: 3 },
        { id: 3, name: 'Internet Factory', unlockPrestige: 5 },
        { id: 4, name: 'Universe Factory', unlockPrestige: 10 },
        { id: 5, name: 'God Factory', unlockPrestige: 20 },
        { id: 6, name: 'Multiverse', unlockPrestige: 50 },
        { id: 7, name: 'Brainrot Dimension', unlockPrestige: 100 }
    ]
};

// Заморозка конфига, чтобы исключить случайное изменение в рантайме
Object.freeze(GameConfig.ENGINE);
Object.freeze(GameConfig.SAVE);
Object.freeze(GameConfig.ECONOMY);
Object.freeze(GameConfig.RARITY_WEIGHTS);
Object.freeze(GameConfig.RARITY_COLORS);
Object.freeze(GameConfig.BATTLE_PASS);
Object.freeze(GameConfig.DAILY_REWARDS);
Object.freeze(GameConfig.CHEST_TYPES);
Object.freeze(GameConfig.COMBO);
Object.freeze(GameConfig.CRIT);
Object.freeze(GameConfig.JUICE);
Object.freeze(GameConfig.ADS);
Object.freeze(GameConfig.AUDIO);
Object.freeze(GameConfig.UI);
Object.freeze(GameConfig.LOADING_STEPS);
Object.freeze(GameConfig.EVENTS);
Object.freeze(GameConfig.CURRENCY);
Object.freeze(GameConfig.WORLDS);
Object.freeze(GameConfig);