/**
 * Класс BigNumber
 * Представляет сверхбольшие числа в формате: mantissa * 10^exponent.
 * Обязательно для Idle игр, где числа уходят в бесконечность.
 */
class BigNumber {
    /**
     * @param {number|string|BigNumber} value 
     */
    constructor(value = 0) {
        this.mantissa = 0;
        this.exponent = 0;

        if (value instanceof BigNumber) {
            this.mantissa = value.mantissa;
            this.exponent = value.exponent;
        } else if (typeof value === 'string') {
            this.parseString(value);
        } else if (typeof value === 'number') {
            this.parseNumber(value);
        }

        this.normalize();
    }

    parseNumber(value) {
        if (value === 0) {
            this.mantissa = 0;
            this.exponent = 0;
            return;
        }
        this.exponent = Math.floor(Math.log10(Math.abs(value)));
        this.mantissa = value / Math.pow(10, this.exponent);
    }

    parseString(value) {
        const parts = value.toLowerCase().split('e');
        if (parts.length === 2) {
            this.mantissa = parseFloat(parts[0]);
            this.exponent = parseInt(parts[1], 10);
        } else {
            this.parseNumber(parseFloat(value));
        }
    }

    normalize() {
        if (this.mantissa === 0) {
            this.exponent = 0;
            return;
        }

        if (this.mantissa >= 10 || this.mantissa <= -10 || (this.mantissa < 1 && this.mantissa > -1)) {
            const shift = Math.floor(Math.log10(Math.abs(this.mantissa)));
            this.mantissa /= Math.pow(10, shift);
            this.exponent += shift;
        }

        // Защита от флоатинг-поинт мусора
        this.mantissa = Math.round(this.mantissa * 1e10) / 1e10;
    }

    multiply(other) {
        const num = new BigNumber(other);
        const result = new BigNumber();
        result.mantissa = this.mantissa * num.mantissa;
        result.exponent = this.exponent + num.exponent;
        result.normalize();
        return result;
    }

    divide(other) {
        const num = new BigNumber(other);
        if (num.mantissa === 0) {
            Logger.error('BigNumber', 'Деление на ноль!');
            return new BigNumber(0);
        }
        const result = new BigNumber();
        result.mantissa = this.mantissa / num.mantissa;
        result.exponent = this.exponent - num.exponent;
        result.normalize();
        return result;
    }

    add(other) {
        const num = new BigNumber(other);
        if (this.mantissa === 0) return new BigNumber(num);
        if (num.mantissa === 0) return new BigNumber(this);

        const result = new BigNumber();
        const diff = this.exponent - num.exponent;

        if (Math.abs(diff) > 15) {
            // Если разница порядков огромна, меньшее число не повлияет на результат
            return diff > 0 ? new BigNumber(this) : new BigNumber(num);
        }

        if (diff > 0) {
            result.exponent = this.exponent;
            result.mantissa = this.mantissa + (num.mantissa / Math.pow(10, diff));
        } else {
            result.exponent = num.exponent;
            result.mantissa = (this.mantissa / Math.pow(10, Math.abs(diff))) + num.mantissa;
        }
        
        result.normalize();
        return result;
    }

    subtract(other) {
        const num = new BigNumber(other);
        const negativeNum = new BigNumber(num);
        negativeNum.mantissa *= -1;
        return this.add(negativeNum);
    }

    compare(other) {
        const num = new BigNumber(other);
        if (this.mantissa === 0 && num.mantissa === 0) return 0;
        
        // Сравнение знаков
        if (this.mantissa > 0 && num.mantissa < 0) return 1;
        if (this.mantissa < 0 && num.mantissa > 0) return -1;

        // Если оба положительные
        if (this.mantissa > 0) {
            if (this.exponent > num.exponent) return 1;
            if (this.exponent < num.exponent) return -1;
            if (this.mantissa > num.mantissa) return 1;
            if (this.mantissa < num.mantissa) return -1;
            return 0;
        }
        
        // Если оба отрицательные
        if (this.exponent > num.exponent) return -1;
        if (this.exponent < num.exponent) return 1;
        if (this.mantissa < num.mantissa) return -1;
        if (this.mantissa > num.mantissa) return 1;
        return 0;
    }

    isGreaterThan(other) { return this.compare(other) > 0; }
    isGreaterThanOrEqualTo(other) { return this.compare(other) >= 0; }
    isLessThan(other) { return this.compare(other) < 0; }
    isLessThanOrEqualTo(other) { return this.compare(other) <= 0; }
    isEqualTo(other) { return this.compare(other) === 0; }

    /**
     * Форматирует число для красивого отображения (1.5K, 2.3M, 4.0B, 1.2aa)
     */
    format() {
        if (this.exponent < 3) {
            const val = this.mantissa * Math.pow(10, this.exponent);
            return Math.floor(val).toString();
        }

        const suffixes = [
            "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid"
        ];
        
        const suffixIndex = Math.floor(this.exponent / 3);
        const mantissaShift = this.exponent % 3;
        const displayMantissa = this.mantissa * Math.pow(10, mantissaShift);
        
        let suffix = "";
        if (suffixIndex < suffixes.length) {
            suffix = suffixes[suffixIndex];
        } else {
            // Для супер-больших чисел генерируем: aa, ab, ac...
            const alphabet = "abcdefghijklmnopqrstuvwxyz";
            const extIndex = suffixIndex - suffixes.length;
            const firstChar = alphabet[Math.floor(extIndex / 26) % 26];
            const secondChar = alphabet[extIndex % 26];
            suffix = firstChar + secondChar;
        }

        // Округляем до 2 знаков после запятой
        let formatted = displayMantissa.toFixed(2);
        // Убираем нули на конце (.00)
        formatted = formatted.replace(/\.00$/, '');

        return formatted + suffix;
    }

    toNumber() {
        if (this.exponent > 308) return Number.MAX_VALUE * Math.sign(this.mantissa);
        return this.mantissa * Math.pow(10, this.exponent);
    }
    
    clone() {
        return new BigNumber(this);
    }
}