const levels = require('./consts/levels');

class Throttle {
    constructor(logger) {
        this._logger = logger;
        this._logs = new Map();
        this._interval(this._logger._config.throttle.wait);
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

    _interval(wait) {
        setInterval(() => {
            this._logs.forEach((v, k) => {
                if (Date.now() - v.timestamp > wait) {
                    this._logs.delete(k);
                }
            });
        }, wait / 3);
    }

    _log(type, message, meta, error) {
        const msg = typeof message === 'string' ? message.substr(0, 100) : null;
        let log = this._logs.get(msg);
        if (!log) {
            log = { type, message, meta, error, timestamp: Date.now() };
            this._logs.set(msg, log);
            this._write(log);
        }
    }

    _write(log) {
        this._logger[log.type](log.message, log.meta, log.error);
    }
}

module.exports = Throttle;
