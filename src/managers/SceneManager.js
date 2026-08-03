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

        // Регистрация базовых сцен
        this.registerScene('BootScene', new BootScene(this));
        this.registerScene('MainGameScene', new MainGameScene(this));
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

// --- Заглушки сцен для инициализации (будут расширены в следующих файлах) ---

class BootScene {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
    }
    enter() {
        Logger.info('BootScene', 'Вход в BootScene. Автоматический переход в MainGameScene.');
        // Сразу переходим в главный геймплей после инициализации
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

class MainGameScene {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
    }
    enter() {
        Logger.info('MainGameScene', 'Игровая сцена активирована.');
    }
    exit() {}
    update(dt) {
        // Обновление фабричных линий и логики геймплея
        const game = window.gameInstance;
        if (game && game.managers && game.managers.factory) {
            game.managers.factory.update(dt);
        }
    }
    render(ctx) {
        // Рендер фабрики, конвейеров и существ на Canvas
        const game = window.gameInstance;
        
        // Рендерим фон сцены
        ctx.fillStyle = '#141923';
        ctx.fillRect(0, 0, GameConfig.ENGINE.CANVAS_LOGICAL_WIDTH, GameConfig.ENGINE.CANVAS_LOGICAL_HEIGHT);
        
        // Заголовок
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🧠 Brainrot Factory Evolution', 540, 80);
        
        // Рендерим фабрику
        if (game && game.managers && game.managers.factory) {
            game.managers.factory.render(ctx);
        }
        
        // Отображение ресурсов вверху экрана
        if (game && game.managers && game.managers.economy) {
            const currency = game.managers.economy.getBalance('coins');
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`💰 ${currency.format()}`, 20, 50);
        }
    }
}