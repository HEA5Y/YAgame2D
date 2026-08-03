/**
 * Класс BootScene
 * Начальная сцена загрузки, автоматически переключается в MainGameScene.
 */
class BootScene {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
    }
    enter() {
        Logger.info('BootScene', 'Вход в BootScene. Автоматический переход в MainGameScene.');
        setTimeout(() => {
            this.sceneManager.changeScene('MainGameScene');
        }, 100);
    }
    exit() {}
    update(dt) {}
    render(ctx) {
        // Очистка или заставка
    }
}

/**
 * Класс MainGameScene
 * Основная игровая сцена с фабрикой и HUD.
 */
class MainGameScene {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
    }
    enter() {
        Logger.info('MainGameScene', 'Игровая сцена активирована.');
    }
    exit() {}
    update(dt) {
        // Обновление фабричных линий через реестр
        const factoryManager = ManagerRegistry.get('factory');
        if (factoryManager && typeof factoryManager.update === 'function') {
            factoryManager.update(dt);
        }
    }
    render(ctx) {
        const factoryManager = ManagerRegistry.get('factory');
        const economyManager = ManagerRegistry.get('economy');
        
        // Рендерим фон сцены
        ctx.fillStyle = '#141923';
        ctx.fillRect(0, 0, GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH, GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT);
        
        // Заголовок
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🧠 Brainrot Factory Evolution', 540, 80);
        
        // Рендерим фабрику
        if (factoryManager && typeof factoryManager.render === 'function') {
            factoryManager.render(ctx);
        }
        
        // Отображение ресурсов вверху экрана
        if (economyManager) {
            const currency = economyManager.getBalance('coins');
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`💰 ${currency.format()}`, 20, 50);
        }
    }
}

/**
 * Класс SceneManager
 * Управляет жизненным циклом и переключением игровых сцен (экранов).
 */
class SceneManager {
    /**
     * @param {Game} game Главный экземпляр игры
     */
    constructor(game) {
        this.game = game;
        this.scenes = new Map();
        this.currentScene = null;
        this.currentSceneName = '';
    }

    /**
     * Инициализация сцен (вызывается после загрузки всех скриптов и менеджеров)
     */
    initScenes() {
        this.registerScene('BootScene', new BootScene(this));
        this.registerScene('MainGameScene', new MainGameScene(this));
        
        // Автоматический старт с BootScene
        this.changeScene('BootScene');
    }

    /**
     * Зарегистрировать сцену в менеджере
     * @param {string} name Имя сцены
     * @param {Object} sceneInstance Экземпляр сцены
     */
    registerScene(name, sceneInstance) {
        this.scenes.set(name, sceneInstance);
    }

    /**
     * Переключиться на другую сцену
     * @param {string} name Имя сцены
     */
    changeScene(name) {
        if (!this.scenes.has(name)) {
            Logger.error('SceneManager', `Попытка переключиться на несуществующую сцену: ${name}`);
            return;
        }

        Logger.info('SceneManager', `Переключение сцены: ${this.currentSceneName} -> ${name}`);

        // Выход из текущей сцены
        if (this.currentScene && typeof this.currentScene.exit === 'function') {
            this.currentScene.exit();
        }

        this.currentSceneName = name;
        this.currentScene = this.scenes.get(name);

        // Вход в новую сцену
        if (this.currentScene && typeof this.currentScene.enter === 'function') {
            this.currentScene.enter();
        }
    }

    update(dt) {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            this.currentScene.update(dt);
        }
    }

    render(ctx) {
        if (this.currentScene && typeof this.currentScene.render === 'function') {
            this.currentScene.render(ctx);
        }
    }
}