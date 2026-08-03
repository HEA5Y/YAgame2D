/**
 * EventData.js
 * Список случайных событий (100+).
 */

const EventData = (() => {
    const events = [];

    // Золотые персонажи
    for (let i = 0; i < 10; i++) {
        events.push({
            id: `event_golden_${i}`,
            name: `Золотой работник #${i+1}`,
            description: 'Ваш работник приносит двойной доход!',
            duration: 60, // секунд
            effect: (economy) => {
                economy.setGlobalMultiplier('income', 2.0);
            },
            deactivate: (economy) => {
                economy.setGlobalMultiplier('income', 1.0);
            },
            weight: 10,
            type: 'boost'
        });
    }

    // Скидки
    for (let i = 0; i < 10; i++) {
        const discount = 0.5 + Math.random() * 0.3;
        events.push({
            id: `event_discount_${i}`,
            name: `Скидка ${Math.round((1-discount)*100)}%`,
            description: 'Скидка на улучшения!',
            duration: 120,
            effect: (economy) => {
                economy.setGlobalMultiplier('costDiscount', discount);
            },
            deactivate: (economy) => {
                economy.setGlobalMultiplier('costDiscount', 1.0);
            },
            weight: 15,
            type: 'discount'
        });
    }

    // Аварии (отрицательные события)
    for (let i = 0; i < 10; i++) {
        events.push({
            id: `event_accident_${i}`,
            name: 'Авария на линии!',
            description: 'Потеряно 10% монет.',
            duration: 10,
            effect: (economy) => {
                const balance = economy.getBalance(GameConfig.CURRENCY.COINS);
                const loss = balance.multiply(0.1);
                economy.spendCurrency(GameConfig.CURRENCY.COINS, loss, 'accident');
                // показать уведомление
                gameEventBus.emit('show_notification', { text: `Потеряно ${loss.format()} монет!`, icon: '💥' });
            },
            deactivate: () => {},
            weight: 5,
            type: 'disaster'
        });
    }

    // Метеориты – случайный бонус
    for (let i = 0; i < 10; i++) {
        events.push({
            id: `event_meteor_${i}`,
            name: 'Метеорит с ресурсами!',
            description: 'Получено 500 монет.',
            duration: 5,
            effect: (economy) => {
                economy.addCurrency(GameConfig.CURRENCY.COINS, 500, 'meteor');
                gameEventBus.emit('show_notification', { text: 'Метеорит принёс 500 монет!', icon: '☄️' });
            },
            deactivate: () => {},
            weight: 8,
            type: 'bonus'
        });
    }

    // Аномалии – ускоряют производство
    for (let i = 0; i < 10; i++) {
        events.push({
            id: `event_anomaly_${i}`,
            name: 'Временная аномалия',
            description: 'Производство ускорено в 3 раза!',
            duration: 30,
            effect: (economy) => {
                // через EventBus влияем на скорость линий
                gameEventBus.emit('modifier_speed', 3.0);
            },
            deactivate: () => {
                gameEventBus.emit('modifier_speed', 1.0);
            },
            weight: 7,
            type: 'boost'
        });
    }

    // Инспекции – штраф или бонус
    for (let i = 0; i < 10; i++) {
        events.push({
            id: `event_inspection_${i}`,
            name: 'Инспекция',
            description: 'Если производство > 1000/сек, получите бонус, иначе штраф.',
            duration: 60,
            effect: (economy, factoryManager) => {
                // Проверка производства (заглушка)
                const production = factoryManager ? factoryManager.getTotalProductionPerSecond() : new BigNumber(1000);
                if (production.isGreaterThan(1000)) {
                    economy.addCurrency(GameConfig.CURRENCY.COINS, 1000, 'inspection_good');
                    gameEventBus.emit('show_notification', { text: 'Инспекция прошла успешно! +1000 монет', icon: '✅' });
                } else {
                    economy.spendCurrency(GameConfig.CURRENCY.COINS, 500, 'inspection_bad');
                    gameEventBus.emit('show_notification', { text: 'Инспекция выявила нарушения, -500 монет', icon: '❌' });
                }
            },
            deactivate: () => {},
            weight: 6,
            type: 'random'
        });
    }

    // Добавим ещё много случайных событий до 100
    for (let i = 0; i < 30; i++) {
        events.push({
            id: `event_random_${i}`,
            name: `Случайное событие #${i+1}`,
            description: 'Получите случайный бонус или штраф.',
            duration: 20 + Math.random() * 40,
            effect: (economy) => {
                if (Math.random() > 0.5) {
                    const amount = Math.floor(Math.random() * 1000) + 100;
                    economy.addCurrency(GameConfig.CURRENCY.COINS, amount, 'random_bonus');
                    gameEventBus.emit('show_notification', { text: `+${amount} монет!`, icon: '🎉' });
                } else {
                    const amount = Math.floor(Math.random() * 500) + 50;
                    economy.spendCurrency(GameConfig.CURRENCY.COINS, amount, 'random_penalty');
                    gameEventBus.emit('show_notification', { text: `-${amount} монет`, icon: '💸' });
                }
            },
            deactivate: () => {},
            weight: 5,
            type: 'random'
        });
    }

    return Object.freeze(events);
})();