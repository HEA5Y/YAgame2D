/**
 * QuestData.js
 * Шаблоны для ежедневных, еженедельных и сезонных квестов.
 */

const QuestData = (() => {
    const dailyQuests = [
        { id: 'daily_produce_100', description: 'Произведите 100 монет', goal: 100, reward: { coins: 50 }, resetPeriod: 'daily' },
        { id: 'daily_produce_500', description: 'Произведите 500 монет', goal: 500, reward: { coins: 200 }, resetPeriod: 'daily' },
        { id: 'daily_produce_2000', description: 'Произведите 2000 монет', goal: 2000, reward: { coins: 500 }, resetPeriod: 'daily' },
        { id: 'daily_upgrade_1', description: 'Улучшите любую линию 1 раз', goal: 1, reward: { gems: 2 }, resetPeriod: 'daily' },
        { id: 'daily_upgrade_5', description: 'Улучшите любую линию 5 раз', goal: 5, reward: { gems: 8 }, resetPeriod: 'daily' },
        { id: 'daily_research_1', description: 'Завершите 1 исследование', goal: 1, reward: { research: 5 }, resetPeriod: 'daily' },
        { id: 'daily_collect_manual', description: 'Соберите ручной доход 3 раза', goal: 3, reward: { coins: 100 }, resetPeriod: 'daily' },
        { id: 'daily_watch_ad', description: 'Посмотрите 1 рекламное видео', goal: 1, reward: { gems: 5 }, resetPeriod: 'daily' },
    ];

    const weeklyQuests = [
        { id: 'weekly_produce_50k', description: 'Произведите 50,000 монет', goal: 50000, reward: { gems: 30 }, resetPeriod: 'weekly' },
        { id: 'weekly_produce_1M', description: 'Произведите 1,000,000 монет', goal: 1000000, reward: { gems: 80 }, resetPeriod: 'weekly' },
        { id: 'weekly_upgrade_50', description: 'Улучшите линии 50 раз', goal: 50, reward: { gems: 50 }, resetPeriod: 'weekly' },
        { id: 'weekly_research_10', description: 'Завершите 10 исследований', goal: 10, reward: { gems: 60 }, resetPeriod: 'weekly' },
        { id: 'weekly_prestige', description: 'Совершите 1 престиж', goal: 1, reward: { gems: 100 }, resetPeriod: 'weekly' },
        { id: 'weekly_creatures_5', description: 'Откройте 5 новых существ', goal: 5, reward: { gems: 40 }, resetPeriod: 'weekly' },
        { id: 'weekly_achievements_3', description: 'Разблокируйте 3 достижения', goal: 3, reward: { gems: 30 }, resetPeriod: 'weekly' },
    ];

    const seasonalQuests = [
        { id: 'seasonal_produce_10M', description: 'Произведите 10,000,000 монет', goal: 10000000, reward: { gems: 200 }, resetPeriod: 'seasonal' },
        { id: 'seasonal_upgrade_200', description: 'Улучшите линии 200 раз', goal: 200, reward: { gems: 150 }, resetPeriod: 'seasonal' },
        { id: 'seasonal_research_50', description: 'Завершите 50 исследований', goal: 50, reward: { gems: 300 }, resetPeriod: 'seasonal' },
        { id: 'seasonal_prestige_5', description: 'Совершите 5 престижей', goal: 5, reward: { gems: 500 }, resetPeriod: 'seasonal' },
    ];

    return Object.freeze({ dailyQuests, weeklyQuests, seasonalQuests });
})();