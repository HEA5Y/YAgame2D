/**
 * AchievementData.js
 * Шаблоны для 200+ достижений.
 */

const AchievementData = (() => {
    const templates = [];

    // Достижения по монетам
    const coinMilestones = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];
    coinMilestones.forEach((val, idx) => {
        templates.push({
            id: `ach_coins_${idx}`,
            name: val >= 1000 ? `${val/1000}K монет` : `${val} монет`,
            description: `Заработайте ${val} монет за всё время`,
            type: 'coins_total',
            condition: (progress) => progress >= val,
            reward: { gems: Math.floor(val / 100) + 5 }
        });
    });

    // Достижения по улучшениям
    const upgradeMilestones = [1, 5, 10, 25, 50, 100, 200, 500];
    upgradeMilestones.forEach((val, idx) => {
        templates.push({
            id: `ach_upgrades_${idx}`,
            name: `${val} улучшений`,
            description: `Купите ${val} улучшений`,
            type: 'upgrades_purchased',
            condition: (progress) => progress >= val,
            reward: { gems: val * 2 }
        });
    });

    // Достижения по престижу
    for (let i = 1; i <= 10; i++) {
        templates.push({
            id: `ach_prestige_${i}`,
            name: `Престиж ${i}`,
            description: `Совершите ${i} престижей`,
            type: 'prestige_count',
            condition: (progress) => progress >= i,
            reward: { gems: i * 10 }
        });
    }

    // Достижения по исследованиям
    const researchMilestones = [1, 5, 10, 25, 50];
    researchMilestones.forEach((val, idx) => {
        templates.push({
            id: `ach_research_${idx}`,
            name: `${val} исследований`,
            description: `Завершите ${val} исследований`,
            type: 'research_completed',
            condition: (progress) => progress >= val,
            reward: { gems: val * 5 }
        });
    });

    // Достижения по коллекции существ
    const creatureMilestones = [1, 5, 10, 25, 50, 100, 150];
    creatureMilestones.forEach((val, idx) => {
        templates.push({
            id: `ach_creatures_${idx}`,
            name: `${val} существ`,
            description: `Откройте ${val} существ в энциклопедии`,
            type: 'creatures_unlocked',
            condition: (progress) => progress >= val,
            reward: { gems: val * 3 }
        });
    });

    // Достижения по времени игры
    const timeMilestones = [3600, 86400, 604800, 2592000, 7776000]; // 1ч, 1д, 7д, 30д, 90д
    const timeNames = ['1 час', '1 день', '7 дней', '30 дней', '90 дней'];
    timeMilestones.forEach((val, idx) => {
        templates.push({
            id: `ach_time_${idx}`,
            name: `${timeNames[idx]} в игре`,
            description: `Проведите в игре ${timeNames[idx]}`,
            type: 'play_time',
            condition: (progress) => progress >= val,
            reward: { gems: val / 3600 * 5 }
        });
    });

    return Object.freeze(templates);
})();