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
        const econ = window.gameInstance.managers.economy;
        const factory = window.gameInstance.managers.factory; // может быть undefined пока
        if (event.effect) {
            event.effect(econ, factory);
        }

        // Показываем уведомление
        gameEventBus.emit('show_notification', {
            text: `Событие: ${event.name} - ${event.description}`,
            icon: '⚡'
        });

        Logger.info('EventManager', `Активировано событие: ${event.name}`);

        // Устанавливаем таймер на деактивацию
        setTimeout(() => {
            this.deactivateEvent(activeEvent);
        }, event.duration * 1000);
    }

    deactivateEvent(activeEvent) {
        // Удаляем из активных
        const index = this.activeEvents.indexOf(activeEvent);
        if (index !== -1) this.activeEvents.splice(index, 1);

        // Вызываем деактивацию
        if (activeEvent.deactivate) {
            const econ = window.gameInstance.managers.economy;
            activeEvent.deactivate(econ);
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