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
    }
    render(ctx) {
        // Рендер фабрики, конвейеров и существ на Canvas
        ctx.fillStyle = '#141923';
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Brainrot Factory Evolution', 540, 200);
        ctx.font = '24px Arial';
        ctx.fillStyle = '#8888aa';
        ctx.fillText('Фабрика мемных существ работает!', 540, 260);
    }
}