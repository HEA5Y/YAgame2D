/**
 * EventManager.js
 * Управляет случайными событиями.
 */

class EventManager {
    constructor() {
        this.activeEvents = [];
        this.eventPool = EventData; // массив всех возможных событий
        this.cooldown = 0;
        this.checkInterval = 30000; // каждые 30 секунд
        this.eventTimers = new Map(); // ИСПРАВЛЕНО: храним ID таймеров для очистки
        
        this.subscribeEvents();

        setInterval(() => this.tryTriggerEvent(), this.checkInterval);
        Logger.info('EventManager', `Загружено ${this.eventPool.length} событий`);
    }

    subscribeEvents() {
        // Слушаем изменения в экономике для определения триггеров
        // Например, при достижении определённого дохода
    }

    tryTriggerEvent() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        // Шанс 10% на событие
        if (Math.random() > 0.1) return;

        // Выбираем событие с учётом веса
        const selected = this.pickWeightedEvent();
        if (!selected) return;

        this.activateEvent(selected);
        // Устанавливаем кулдаун (в минутах)
        this.cooldown = 5; // 5 минут
    }

    pickWeightedEvent() {
        // Суммируем веса
        const totalWeight = this.eventPool.reduce((sum, ev) => sum + (ev.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const ev of this.eventPool) {
            random -= (ev.weight || 1);
            if (random <= 0) {
                return ev;
            }
        }
        return null;
    }

    activateEvent(event) {
        // Клонируем, чтобы избежать мутации
        const activeEvent = { ...event, startTime: Date.now() };
        this.activeEvents.push(activeEvent);

        // Применяем эффект
        // ИСПРАВЛЕНО: получаем менеджеры из реестра
        const econ = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
        const factory = (window.ManagerRegistry) ? window.ManagerRegistry.get('factory') : null;
        
        if (event.effect) {
            try {
                event.effect(econ, factory);
            } catch (error) {
                Logger.error('EventManager', `Ошибка при активации события ${event.name}:`, error);
            }
        }

        // Показываем уведомление
        gameEventBus.emit('show_notification', {
            text: `Событие: ${event.name} - ${event.description}`,
            icon: '⚡'
        });

        Logger.info('EventManager', `Активировано событие: ${event.name}`);

        // Устанавливаем таймер на деактивацию
        const timerId = setTimeout(() => {
            this.deactivateEvent(activeEvent);
        }, event.duration * 1000);
        
        // ИСПРАВЛЕНО: сохраняем ID таймера для возможной отмены
        this.eventTimers.set(activeEvent.id, timerId);
    }

    deactivateEvent(activeEvent) {
        // ИСПРАВЛЕНО: очищаем таймер если он ещё активен
        const timerId = this.eventTimers.get(activeEvent.id);
        if (timerId) {
            clearTimeout(timerId);
            this.eventTimers.delete(activeEvent.id);
        }
        
        // Удаляем из активных
        const index = this.activeEvents.indexOf(activeEvent);
        if (index !== -1) this.activeEvents.splice(index, 1);

        // Вызываем деактивацию
        if (activeEvent.deactivate) {
            const econ = (window.ManagerRegistry) ? window.ManagerRegistry.get('economy') : null;
            try {
                activeEvent.deactivate(econ);
            } catch (error) {
                Logger.error('EventManager', `Ошибка при деактивации события ${activeEvent.name}:`, error);
            }
        }

        gameEventBus.emit('show_notification', {
            text: `Событие "${activeEvent.name}" завершено`,
            icon: '⏹️'
        });
        Logger.info('EventManager', `Событие деактивировано: ${activeEvent.name}`);
    }

    // Метод для получения текущих активных событий (для UI)
    getActiveEvents() {
        return this.activeEvents;
    }
}