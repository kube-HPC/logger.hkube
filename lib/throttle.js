const levels = require('./consts/levels');

class Throttle {
    constructor(logger, config) {
        this._logger = logger;
        this._logs = new Map();
        const delay = config?.wait || 30000;
        this._interval(delay);
    }

    trace(message, meta) {
        this._log(levels.TRACE.name, message, meta);
    }

    silly(message, meta) {
        this._log(levels.SILLY.name, message, meta);
    }

    debug(message, meta) {
        this._log(levels.DEBUG.name, message, meta);
    }

    info(message, meta) {
        this._log(levels.INFO.name, message, meta);
    }

    warning(message, meta) {
        this._log(levels.WARN.name, message, meta);
    }

    error(message, meta, error) {
        this._log(levels.ERROR.name, message, meta, error);
    }

    critical(message, meta, error) {
        this._log(levels.CRITICAL.name, message, meta, error);
    }

    _interval(delay) {
        setInterval(() => {
            this._logs.forEach((v, k) => {
                if (Date.now() - v.timestamp > delay) {
                    this._logs.delete(k);
                }
            });
        }, delay / 3);
    }

    _log(type, message, meta, error) {
        const throttleTopic = meta?.throttleTopic;
        let key = null;

        if (throttleTopic) {
            key = throttleTopic;
        }
        else {
            key = typeof message === 'string' ? message.substr(0, 100) : null;
        }
        if (key) {
            let log = this._logs.get(key);
            if (!log) {
                log = { type, message, meta, error, timestamp: Date.now() };
                this._logs.set(key, log);
                this._write(log);
            }
        }
    }

    _write(log) {
        this._logger[log.type](log.message, log.meta, log.error);
    }
}

module.exports = Throttle;
