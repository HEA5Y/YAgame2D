/**
 * Класс EventBus
 * Высокопроизводительная шина событий для обмена сообщениями между подсистемами.
 */
class EventBus {
    constructor() {
        if (EventBus.instance) {
            return EventBus.instance;
        }
        this.listeners = new Map();
        // ИСПРАВЛЕНО: маппинг оригинальных callback → wrapper для корректного off()
        this.onceWrappers = new Map();
        EventBus.instance = this;
    }

    /**
     * Подписаться на событие
     * @param {string} event Название события
     * @param {Function} callback Функция обратного вызова
     * @param {Object} context Контекст (this)
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ callback, context });
    }

    /**
     * Подписаться на событие (однократное срабатывание)
     * @param {string} event Название события
     * @param {Function} callback Функция обратного вызова
     * @param {Object} context Контекст (this)
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            this.off(event, wrapper, context);
            callback.apply(context, args);
        };
        
        // ИСПРАВЛЕНО: сохраняем связь оригинал → wrapper
        const key = `${event}_${callback.toString()}`;
        this.onceWrappers.set(key, wrapper);
        
        this.on(event, wrapper, context);
    }

    /**
     * Отписаться от события
     * @param {string} event Название события
     * @param {Function} callback Функция обратного вызова
     * @param {Object} context Контекст (this)
     */
    off(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            return;
        }
        
        // ИСПРАВЛЕНО: если это off для once, ищем wrapper
        const key = `${event}_${callback.toString()}`;
        const wrapper = this.onceWrappers.get(key);
        
        const targetCallback = wrapper || callback;
        
        const callbacks = this.listeners.get(event);
        const filteredCallbacks = callbacks.filter(
            cb => cb.callback !== targetCallback || cb.context !== context
        );
        
        if (filteredCallbacks.length === 0) {
            this.listeners.delete(event);
        } else {
            this.listeners.set(event, filteredCallbacks);
        }
        
        // Чистим маппинг если wrapper был найден
        if (wrapper) {
            this.onceWrappers.delete(key);
        }
    }

    /**
     * Опубликовать событие
     * @param {string} event Название события
     * @param  {...any} args Аргументы для передачи слушателям
     */
    emit(event, ...args) {
        if (!this.listeners.has(event)) {
            return;
        }

        // Копируем массив, чтобы отписки во время emit не сломали цикл
        const callbacks = [...this.listeners.get(event)];
        
        for (let i = 0; i < callbacks.length; i++) {
            const { callback, context } = callbacks[i];
            try {
                callback.apply(context, args);
            } catch (error) {
                Logger.error('EventBus', `Ошибка при обработке события "${event}":`, error);
            }
        }
    }

    /**
     * Очистить все события
     */
    clearAll() {
        this.listeners.clear();
        this.onceWrappers.clear();
    }
}

// Создаем глобальный экземпляр
const gameEventBus = new EventBus();