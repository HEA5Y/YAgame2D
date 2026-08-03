/**
 * Класс BigNumber
 * Представляет сверхбольшие числа в формате: mantissa * 10^exponent.
 * Оптимизирован для Idle игр: добавлены методы in-place мутаций для снижения нагрузки на GC.
 */
class BigNumber {
    /**
     * @param {number|string|BigNumber} value 
     */
    constructor(value = 0) {
        this.mantissa = 0; //[cite: 50]
        this.exponent = 0; //[cite: 50]

        if (value instanceof BigNumber) {
            this.mantissa = value.mantissa; //[cite: 50]
            this.exponent = value.exponent; //[cite: 50]
        } else if (typeof value === 'string') {
            this.parseString(value); //[cite: 50]
        } else if (typeof value === 'number') {
            this.parseNumber(value); //[cite: 50]
        }

        this.normalize(); //[cite: 50]
    }

    parseNumber(value) {
        if (value === 0) {
            this.mantissa = 0; //[cite: 50]
            this.exponent = 0; //[cite: 50]
            return;
        }
        this.exponent = Math.floor(Math.log10(Math.abs(value))); //[cite: 50]
        this.mantissa = value / Math.pow(10, this.exponent); //[cite: 50]
    }

    parseString(value) {
        const parts = value.toLowerCase().split('e'); //[cite: 50]
        if (parts.length === 2) {
            this.mantissa = parseFloat(parts[0]); //[cite: 50]
            this.exponent = parseInt(parts[1], 10); //[cite: 50]
        } else {
            this.parseNumber(parseFloat(value)); //[cite: 50]
        }
    }

    normalize() {
        if (this.mantissa === 0) {
            this.exponent = 0; //[cite: 50]
            return;
        }

        if (this.mantissa >= 10 || this.mantissa <= -10 || (this.mantissa < 1 && this.mantissa > -1)) {
            const shift = Math.floor(Math.log10(Math.abs(this.mantissa))); //[cite: 50]
            this.mantissa /= Math.pow(10, shift); //[cite: 50]
            this.exponent += shift; //[cite: 50]
        }

        // Защита от флоатинг-поинт мусора
        this.mantissa = Math.round(this.mantissa * 1e10) / 1e10; //[cite: 50]
    }

    // ==========================================
    // IN-PLACE МЕТОДЫ (Использовать в циклах update!)
    // Изменяют текущий объект, экономя память (аналог +=, -=, *=)
    // ==========================================

    addInPlace(other) {
        if (other.mantissa === 0) return this;
        if (this.mantissa === 0) {
            this.mantissa = other.mantissa;
            this.exponent = other.exponent;
            return this;
        }

        const diff = this.exponent - other.exponent;

        if (Math.abs(diff) > 15) {
            if (diff < 0) {
                this.mantissa = other.mantissa;
                this.exponent = other.exponent;
            }
            return this;
        }

        if (diff > 0) {
            this.mantissa += (other.mantissa / Math.pow(10, diff));
        } else {
            this.exponent = other.exponent;
            this.mantissa = (this.mantissa / Math.pow(10, Math.abs(diff))) + other.mantissa;
        }
        
        this.normalize();
        return this;
    }

    subtractInPlace(other) {
        // Создаем временную копию только для инверсии знака
        // В идеале можно оптимизировать и это, но для вычитания сойдет
        const negativeOther = new BigNumber(other);
        negativeOther.mantissa *= -1;
        return this.addInPlace(negativeOther);
    }

    multiplyInPlace(other) {
        this.mantissa *= other.mantissa;
        this.exponent += other.exponent;
        this.normalize();
        return this;
    }

    divideInPlace(other) {
        if (other.mantissa === 0) {
            Logger.error('BigNumber', 'Деление на ноль!');
            this.mantissa = 0;
            this.exponent = 0;
            return this;
        }
        this.mantissa /= other.mantissa;
        this.exponent -= other.exponent;
        this.normalize();
        return this;
    }

    // ==========================================
    // КЛАССИЧЕСКИЕ МЕТОДЫ (Возвращают новый объект)
    // Использовать там, где нужно сохранить исходное значение (например, расчет стоимости)
    // ==========================================

    multiply(other) {
        const num = new BigNumber(other); //[cite: 50]
        const result = new BigNumber(); //[cite: 50]
        result.mantissa = this.mantissa * num.mantissa; //[cite: 50]
        result.exponent = this.exponent + num.exponent; //[cite: 50]
        result.normalize(); //[cite: 50]
        return result; //[cite: 50]
    }

    divide(other) {
        const num = new BigNumber(other); //[cite: 50]
        if (num.mantissa === 0) {
            Logger.error('BigNumber', 'Деление на ноль!'); //[cite: 50]
            return new BigNumber(0); //[cite: 50]
        }
        const result = new BigNumber(); //[cite: 50]
        result.mantissa = this.mantissa / num.mantissa; //[cite: 50]
        result.exponent = this.exponent - num.exponent; //[cite: 50]
        result.normalize(); //[cite: 50]
        return result; //[cite: 50]
    }

    add(other) {
        // Делегируем логику мутирующему методу через клонирование
        return this.clone().addInPlace(new BigNumber(other));
    }

    subtract(other) {
        return this.clone().subtractInPlace(new BigNumber(other));
    }

    // ==========================================
    // СРАВНЕНИЕ И ФОРМАТИРОВАНИЕ
    // ==========================================

    compare(other) {
        const num = new BigNumber(other); //[cite: 50]
        if (this.mantissa === 0 && num.mantissa === 0) return 0; //[cite: 50]
        
        if (this.mantissa > 0 && num.mantissa < 0) return 1; //[cite: 50]
        if (this.mantissa < 0 && num.mantissa > 0) return -1; //[cite: 50]

        if (this.mantissa > 0) {
            if (this.exponent > num.exponent) return 1; //[cite: 50]
            if (this.exponent < num.exponent) return -1; //[cite: 50]
            if (this.mantissa > num.mantissa) return 1; //[cite: 50]
            if (this.mantissa < num.mantissa) return -1; //[cite: 50]
            return 0; //[cite: 50]
        }
        
        if (this.exponent > num.exponent) return -1; //[cite: 50]
        if (this.exponent < num.exponent) return 1; //[cite: 50]
        if (this.mantissa < num.mantissa) return -1; //[cite: 50]
        if (this.mantissa > num.mantissa) return 1; //[cite: 50]
        return 0; //[cite: 50]
    }

    isGreaterThan(other) { return this.compare(other) > 0; } //[cite: 50]
    isGreaterThanOrEqualTo(other) { return this.compare(other) >= 0; } //[cite: 50]
    isLessThan(other) { return this.compare(other) < 0; } //[cite: 50]
    isLessThanOrEqualTo(other) { return this.compare(other) <= 0; } //[cite: 50]
    isEqualTo(other) { return this.compare(other) === 0; } //[cite: 50]

    format() {
        if (this.exponent < 3) {
            const val = this.mantissa * Math.pow(10, this.exponent); //[cite: 50]
            return Math.floor(val).toString(); //[cite: 50]
        }

        const suffixes = [
            "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid"
        ]; //[cite: 50]
        
        const suffixIndex = Math.floor(this.exponent / 3); //[cite: 50]
        const mantissaShift = this.exponent % 3; //[cite: 50]
        const displayMantissa = this.mantissa * Math.pow(10, mantissaShift); //[cite: 50]
        
        let suffix = ""; //[cite: 50]
        if (suffixIndex < suffixes.length) {
            suffix = suffixes[suffixIndex]; //[cite: 50]
        } else {
            const alphabet = "abcdefghijklmnopqrstuvwxyz"; //[cite: 50]
            const extIndex = suffixIndex - suffixes.length; //[cite: 50]
            const firstChar = alphabet[Math.floor(extIndex / 26) % 26]; //[cite: 50]
            const secondChar = alphabet[extIndex % 26]; //[cite: 50]
            suffix = firstChar + secondChar; //[cite: 50]
        }

        let formatted = displayMantissa.toFixed(2); //[cite: 50]
        formatted = formatted.replace(/\.00$/, ''); //[cite: 50]

        return formatted + suffix; //[cite: 50]
    }

    toNumber() {
        if (this.exponent > 308) return Number.MAX_VALUE * Math.sign(this.mantissa); //[cite: 50]
        return this.mantissa * Math.pow(10, this.exponent); //[cite: 50]
    }
    
    clone() {
        return new BigNumber(this); //[cite: 50]
    }
}