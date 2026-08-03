/**
 * Класс TweenManager
 * Высокопроизводительный движок анимаций (Tween). FPS-независимый, с поддержкой easing, delay, loops, yoyo.
 * Интегрируется в главный игровой цикл через Game.update(dt).
 */
class TweenManager {
    constructor() {
        /** @type {Tween[]} */
        this.activeTweens = [];
        this.tweenIdCounter = 0;
    }

    /**
     * Создать и запустить tween
     * @param {Object} target Объект, свойства которого анимируются
     * @param {number} duration Длительность в секундах
     * @param {Object} props Конечные значения свойств { x: 100, alpha: 0 }
     * @param {Object} options Опции: easing, delay, onComplete, onUpdate, yoyo, repeat
     * @returns {Tween} Экземпляр tween для возможной отмены
     */
    to(target, duration, props, options = {}) {
        const tween = new Tween(++this.tweenIdCounter, target, duration, props, options);
        this.activeTweens.push(tween);
        return tween;
    }

    /**
     * Создать tween из текущих значений в заданные и обратно (yoyo)
     */
    fromTo(target, duration, fromProps, toProps, options = {}) {
        // Устанавливаем начальные значения
        for (const key in fromProps) {
            target[key] = fromProps[key];
        }
        return this.to(target, duration, toProps, { ...options, yoyo: true });
    }

    /**
     * Отменить конкретный tween
     */
    kill(tween) {
        const index = this.activeTweens.indexOf(tween);
        if (index !== -1) {
            if (tween.options.onKill) tween.options.onKill();
            this.activeTweens.splice(index, 1);
        }
    }

    /**
     * Отменить все tween'ы для конкретного target
     */
    killTweensOf(target) {
        this.activeTweens = this.activeTweens.filter(t => {
            const kill = t.target === target;
            if (kill && t.options.onKill) t.options.onKill();
            return !kill;
        });
    }

    /**
     * Обновление всех активных tween'ов. Вызывается из Game.update(dt).
     */
    update(dt) {
        for (let i = this.activeTweens.length - 1; i >= 0; i--) {
            const tween = this.activeTweens[i];
            const isComplete = tween.update(dt);
            if (isComplete) {
                if (tween.options.onComplete) tween.options.onComplete();
                this.activeTweens.splice(i, 1);
            }
        }
    }
}

/**
 * Класс Tween
 * Отдельная анимация свойств объекта.
 */
class Tween {
    /**
     * @param {number} id
     * @param {Object} target
     * @param {number} duration В секундах
     * @param {Object} props Конечные значения
     * @param {Object} options
     */
    constructor(id, target, duration, props, options) {
        this.id = id;
        this.target = target;
        this.duration = Math.max(0.001, duration);
        this.props = props;
        this.options = {
            easing: options.easing || 'easeOutQuad',
            delay: options.delay || 0,
            repeat: options.repeat || 0,
            yoyo: options.yoyo || false,
            onStart: options.onStart || null,
            onUpdate: options.onUpdate || null,
            onComplete: options.onComplete || null,
            onKill: options.onKill || null
        };

        this.elapsed = 0;
        this.delayElapsed = 0;
        this.repeatCount = 0;
        this.isReversed = false;

        // Сохраняем начальные значения
        this.startValues = {};
        for (const key in props) {
            this.startValues[key] = target[key] !== undefined ? target[key] : 0;
        }

        if (this.options.onStart) this.options.onStart();
    }

    update(dt) {
        // Задержка
        if (this.delayElapsed < this.options.delay) {
            this.delayElapsed += dt;
            return false;
        }

        this.elapsed += dt;
        let progress = Math.min(this.elapsed / this.duration, 1);

        // Easing
        const easedProgress = this.applyEasing(progress);

        // Интерполяция свойств
        for (const key in this.props) {
            const start = this.startValues[key];
            const end = this.props[key];
            this.target[key] = start + (end - start) * easedProgress;
        }

        if (this.options.onUpdate) this.options.onUpdate(this.target);

        if (progress >= 1) {
            if (this.options.yoyo && !this.isReversed) {
                // Разворачиваем: меняем местами start и end
                for (const key in this.props) {
                    const temp = this.startValues[key];
                    this.startValues[key] = this.props[key];
                    this.props[key] = temp;
                }
                this.elapsed = 0;
                this.isReversed = true;
                return false;
            } else if (this.isReversed) {
                // Завершился yoyo цикл
                this.repeatCount++;
                if (this.repeatCount > this.options.repeat) {
                    return true; // Завершён
                }
                // Сброс для следующего цикла
                this.isReversed = false;
                this.elapsed = 0;
                for (const key in this.props) {
                    const temp = this.startValues[key];
                    this.startValues[key] = this.props[key];
                    this.props[key] = temp;
                }
                return false;
            } else if (this.repeatCount < this.options.repeat) {
                this.repeatCount++;
                this.elapsed = 0;
                return false;
            }
            return true; // Завершён
        }

        return false;
    }

    applyEasing(t) {
        switch (this.options.easing) {
            case 'linear': return t;
            case 'easeInQuad': return t * t;
            case 'easeOutQuad': return MathUtils.easeOutQuad(t);
            case 'easeInOutQuad': return MathUtils.easeInOutQuad(t);
            case 'easeOutElastic': return MathUtils.easeOutElastic(t);
            case 'easeOutBack': return MathUtils.easeOutBack(t);
            case 'easeInCubic': return t * t * t;
            case 'easeOutCubic': return 1 - Math.pow(1 - t, 3);
            case 'easeOutBounce': return this.bounceOut(t);
            default: return MathUtils.easeOutQuad(t);
        }
    }

    bounceOut(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}