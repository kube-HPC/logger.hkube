
class Throttle {
    constructor(logger) {
        this._logger = logger;
        this._logs = new Map();
        this._interval(this._logger._config.throttle.wait);
    }

    silly(message, meta) {
        this._log('silly', message, meta);
    }

    debug(message, meta) {
        this._log('debug', message, meta);
    }

    info(message, meta) {
        this._log('info', message, meta);
    }

    warning(message, meta) {
        this._log('warning', message, meta);
    }

    error(message, meta, error) {
        this._log('error', message, meta, error);
    }

    critical(message, meta, error) {
        this._log('critical', message, meta, error);
    }

    _interval(wait) {
        setInterval(() => {
            this._logs.forEach((v, k) => {
                if (Date.now() - v.timestamp > wait) {
                    this._write(v);
                    this._logs.delete(k);
                }
            });
        }, wait / 3);
    }

    _log(type, message, meta, error) {
        const msg = message.substr(0, 100);
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
