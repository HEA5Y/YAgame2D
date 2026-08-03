/**
 * Класс Logger
 * Централизованная система логирования с поддержкой уровней.
 */
class Logger {
    static LEVEL_DEBUG = 0;
    static LEVEL_INFO = 1;
    static LEVEL_WARN = 2;
    static LEVEL_ERROR = 3;
    static LEVEL_NONE = 4;

    static currentLevel = Logger.LEVEL_DEBUG; // Будет переопределено GameConfig

    static setLevel(level) {
        this.currentLevel = level;
    }

    static debug(context, message, ...args) {
        if (this.currentLevel <= this.LEVEL_DEBUG) {
            console.debug(`%c[DEBUG] [${context}]`, 'color: #888888', message, ...args);
        }
    }

    static info(context, message, ...args) {
        if (this.currentLevel <= this.LEVEL_INFO) {
            console.info(`%c[INFO] [${context}]`, 'color: #00aaff', message, ...args);
        }
    }

    static warn(context, message, ...args) {
        if (this.currentLevel <= this.LEVEL_WARN) {
            console.warn(`%c[WARN] [${context}]`, 'color: #ffaa00', message, ...args);
        }
    }

    static error(context, message, ...args) {
        if (this.currentLevel <= this.LEVEL_ERROR) {
            console.error(`%c[ERROR] [${context}]`, 'color: #ff0000; font-weight: bold', message, ...args);
        }
    }
}