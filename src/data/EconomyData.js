/**
 * Файл EconomyData.js
 * Баланс, стартовые значения и конфигурация экономики.
 */
const EconomyData = {
    // Стартовые балансы при самом первом запуске игры
    STARTING_BALANCES: {
        coins: 0, // Начинаем с абсолютного нуля
        gems: 10, // Приветственный бонус донат-валюты
        brain_cells: 0, // Валюта престижа
        research: 0 // Очки науки
    },

    // Глобальные множители прогрессии
    PROGRESSION: {
        // Базовый множитель роста цены. Если цена на 1 ур = 10, то на 2 ур = 10 * 1.15
        DEFAULT_COST_MULTIPLIER: 1.15, 
        
        // Порог уровней для получения существенного буста (каждые 10, 25, 50 уровней)
        MILESTONES: [10, 25, 50, 100, 250, 500, 1000],
        
        // Множитель дохода при достижении Milestone (обычно х2)
        MILESTONE_BOOST: 2.0
    },

    // Базовые настройки фабричных линий
    FACTORY_LINES: {
        'line_1_reception': {
            id: 'line_1_reception',
            name: 'Прием ресурсов',
            baseCost: 10,
            baseProduction: 1,
            productionTimeBase: 1.0, // В секундах
            costMultiplier: 1.07
        },
        'line_2_cleaning': {
            id: 'line_2_cleaning',
            name: 'Очистка',
            baseCost: 150,
            baseProduction: 15,
            productionTimeBase: 1.5,
            costMultiplier: 1.10
        },
        'line_3_incubator': {
            id: 'line_3_incubator',
            name: 'Инкубатор',
            baseCost: 2500,
            baseProduction: 180,
            productionTimeBase: 3.0,
            costMultiplier: 1.12
        },
        'line_4_mutation': {
            id: 'line_4_mutation',
            name: 'Мутация',
            baseCost: 45000,
            baseProduction: 2800,
            productionTimeBase: 6.0,
            costMultiplier: 1.13
        },
        'line_5_assembly': {
            id: 'line_5_assembly',
            name: 'Сборка',
            baseCost: 900000,
            baseProduction: 45000,
            productionTimeBase: 12.0,
            costMultiplier: 1.14
        },
        'line_6_quality': {
            id: 'line_6_quality',
            name: 'Контроль качества',
            baseCost: 20000000, // 20M
            baseProduction: 850000,
            productionTimeBase: 24.0,
            costMultiplier: 1.14
        },
        'line_7_packaging': {
            id: 'line_7_packaging',
            name: 'Упаковка',
            baseCost: 500000000, // 500M
            baseProduction: 15000000,
            productionTimeBase: 48.0,
            costMultiplier: 1.15
        },
        'line_8_sales': {
            id: 'line_8_sales',
            name: 'Продажа',
            baseCost: 15000000000, // 15B
            baseProduction: 400000000,
            productionTimeBase: 96.0,
            costMultiplier: 1.15
        }
    }
};

// Заморозка объекта баланса для предотвращения мутаций во время игры
Object.freeze(EconomyData);
Object.freeze(EconomyData.STARTING_BALANCES);
Object.freeze(EconomyData.PROGRESSION);
Object.freeze(EconomyData.FACTORY_LINES);