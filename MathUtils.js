/**
 * Класс MathUtils
 * Сборник высокопроизводительных математических утилит и Easing функций для анимаций.
 */
class MathUtils {
    /**
     * Ограничивает значение между min и max
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Линейная интерполяция
     */
    static lerp(start, end, t) {
        return start + (end - start) * this.clamp(t, 0, 1);
    }

    /**
     * Возвращает случайное число с плавающей точкой в диапазоне
     */
    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Возвращает случайное целое число в диапазоне (включая min и max)
     */
    static randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Выбирает случайный элемент из массива
     */
    static randomElement(array) {
        if (!array || array.length === 0) return null;
        return array[this.randomInt(0, array.length - 1)];
    }

    /**
     * Выбирает случайный элемент с учетом весов
     * @param {Array} items Массив объектов вида { item: any, weight: number }
     */
    static weightedRandom(items) {
        let totalWeight = 0;
        for (let i = 0; i < items.length; i++) {
            totalWeight += items[i].weight;
        }

        let random = Math.random() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            if (random < items[i].weight) {
                return items[i].item;
            }
            random -= items[i].weight;
        }
        return items[items.length - 1].item;
    }

    // --- Easing Функции для анимаций окон и попапов ---

    static easeOutQuad(t) {
        return t * (2 - t);
    }

    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    static easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    static easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
}