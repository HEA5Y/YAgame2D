/**
 * UpgradeData.js
 * Содержит шаблоны для всех улучшений (300+).
 * Каждый шаблон описывает id, название, категорию, базовую стоимость, множитель,
 * максимальный уровень и функцию эффекта.
 */

const UpgradeData = (() => {
    const templates = [];

    // Генерация улучшений по категориям
    const categories = ['speed', 'income', 'cost', 'energy', 'rarity', 'luck', 'efficiency', 'automation'];
    const categoryPrefix = {
        speed: 'Скорость',
        income: 'Доход',
        cost: 'Стоимость',
        energy: 'Энергия',
        rarity: 'Редкость',
        luck: 'Удача',
        efficiency: 'Эффективность',
        automation: 'Автоматизация'
    };

    let idCounter = 0;

    for (let cat of categories) {
        for (let i = 1; i <= 40; i++) { // по 40 на категорию = 320
            idCounter++;
            const baseCost = Math.floor(10 * Math.pow(1.5, idCounter / 10));
            const maxLevel = 50;
            const costMultiplier = 1.12 + (idCounter % 5) * 0.01;
            let effect;
            switch (cat) {
                case 'speed':
                    effect = (level) => ({ speedMultiplier: 1 + level * 0.02 });
                    break;
                case 'income':
                    effect = (level) => ({ incomeMultiplier: 1 + level * 0.05 });
                    break;
                case 'cost':
                    effect = (level) => ({ costDiscount: 1 - level * 0.01 });
                    break;
                case 'energy':
                    effect = (level) => ({ energyMultiplier: 1 + level * 0.03 });
                    break;
                case 'rarity':
                    effect = (level) => ({ rarityBoost: level * 0.005 });
                    break;
                case 'luck':
                    effect = (level) => ({ luckBoost: level * 0.01 });
                    break;
                case 'efficiency':
                    effect = (level) => ({ efficiencyMultiplier: 1 + level * 0.025 });
                    break;
                case 'automation':
                    effect = (level) => ({ automationLevel: level }); // влияет на авто-сбор
                    break;
                default:
                    effect = () => ({});
            }
            templates.push({
                id: `upg_${String(idCounter).padStart(3, '0')}`,
                name: `${categoryPrefix[cat]} ${i}`,
                description: `Увеличивает ${categoryPrefix[cat].toLowerCase()} на ${cat === 'cost' ? '-' : '+'}${cat === 'cost' ? i : i*2}%`,
                category: cat,
                baseCost: baseCost,
                maxLevel: maxLevel,
                costMultiplier: costMultiplier,
                effect: effect,
                icon: '' // можно добавить позже
            });
        }
    }

    return Object.freeze(templates);
})();