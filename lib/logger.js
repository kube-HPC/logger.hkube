const winston = require('winston');
const os = require('os');
require('colors');
const moment = require('moment');
const stackTrace = require('stack-trace');
const stringTemplate = require('string-template');
const Throttle = require('./throttle');
const LEVELS = require('./consts/levels');
const { levelsMap, colorsMap, resolveLevel } = require('./helpers/levels');
const Pluginer = require('./pluginer');
const MetadataEnrichers = require('./metadataEnrichers');
require('winston-logstash');
require('./transports/redis-transport');
require('./transports/null-logger');

const container = new Map();

const DEFAULTS = {
    LOG_FORMAT: '{time} -> {level}: {component} {message} {extra}',
    DATE_FORMAT: 'MMMM Do YYYY, h:mm:ss a'
};

class Logger {
    constructor(containerName, config) {
        this.verifyConfiguration(config);
        this._config = config;
        this._serviceName = containerName;
        this._containerName = containerName;
        this._options = config.options || {};

        this.container = winston.createLogger({
            transports: this._createTransports(this._config),
            levels: levelsMap
        });
        winston.addColors(colorsMap);
        this.container.on('error', error => console.log(`error -${error}`));

        this.plugins = new Pluginer(this);
        this.metadataEnrichers = new MetadataEnrichers(this);
        this.throttle = new Throttle(this, this._options.throttle);
        container.set(containerName, this);
    }

    _loggerFormat({ level, message, meta }, format) {
        let component;
        let extra;
        if (meta?.internal?.component) {
            component = `(${meta.internal.component})`;
        }
        if (this._options.extraDetails) {
            const trc = stackTrace.get();
            const trace = {
                fileName: trc[10].getFileName(),
                functionName: trc[10].getFunctionName(),
                lineNumber: trc[10].getLineNumber()
            };
            extra = `{{ function: ${trace.functionName} file: ${trace.fileName} lineNumber: ${trace.lineNumber} }}`;
        }
        const currentFormat = format || DEFAULTS.LOG_FORMAT;
        const time = moment().format(DEFAULTS.DATE_FORMAT);
        const logMessage = stringTemplate(currentFormat, { extra, time, level, component, message });
        return logMessage;
    }

    // for compatibility
    static GetLogFromContanier(containerName) {
        return Logger.GetLogFromContainer(containerName);
    }

    static GetLogFromContainer(containerName) {
        if (!containerName) {
            return container.values().next().value;
        }
        return container.get(containerName);
    }

    verifyConfiguration(config) {
        if (!config) {
            throw new Error('config is required');
        }
        if (config.transport.logstash && (!config.logstash || !config.logstash.logstashURL)) {
            throw new Error('logstashURL is not defined');
        }
    }

    updateTraceLevel(level) {
        this._level = level;
    }

    get config() {
        return this._config;
    }

    get serviceName() {
        return this._serviceName;
    }

    _createTransports(config) {
        const transports = [];

        if (config.transport.console) {
            const { format, level, transportConfig } = this._createTransportFormat(config.console);
            transports.push(
                new winston.transports.Console({
                    ...transportConfig,
                    level,
                    format,
                })
            );
        }
        if (config.transport.redis) {
            transports.push(
                new winston.transports.RedisTransport({
                    level: config.redis.level,
                    serviceName: this._containerName,
                    redis: this._config.redis,
                    onConfigChange: level => {
                        this._level = level;
                    }
                })
            );
        }
        if (config.transport.file) {
            const { format, level, transportConfig } = this._createTransportFormat(config.file);
            transports.push(
                new winston.transports.File({
                    ...transportConfig,
                    level,
                    format,
                })
            );
        }
        if (transports.length === 0) {
            transports.push(new winston.transports.NullLogger());
        }
        return transports;
    }

    _createTransportFormat(config) {
        const formats = [];
        const { json, level, format, colors, ...transportConfig } = config || {};
        if (!json) {
            formats.push(winston.format.printf((...args) => this._loggerFormat(...args, format)));
        }
        if (colors) {
            formats.push(winston.format.colorize());
        }
        let newFormat;
        const newLevel = resolveLevel(level, levelsMap);
        if (formats.length) {
            newFormat = winston.format.combine(...formats);
        }
        return { format: newFormat, level: newLevel, transportConfig };
    }

    _getMetaData(level, metaLog, error) {
        const tmp = metaLog || {};
        let trace = null;
        const data = this.metadataEnrichers.enrichMetadata(tmp);

        if (level === LEVELS.ERROR.name || level === LEVELS.CRITICAL.name) {
            trace = this._getTrace(error);
        }
        const meta = {
            type: this._serviceName,
            hostName: os.hostname(),
            uptime: os.uptime(),
            internal: data,
            trace,
            timestamp: Date.now()
        };
        return meta;
    }

    _getTrace(err) {
        const traces = [];
        const stack = err ? stackTrace.parse(err) : stackTrace.get();
        stack.forEach((site) => {
            const trace = {
                column: site.getColumnNumber(),
                file: site.getFileName(),
                line: site.getLineNumber(),
                method: site.getFunctionName() || site.getMethodName()
            };
            traces.push(trace);
        });
        return traces;
    }

    trace(message, meta) {
        this._log(LEVELS.TRACE.name, message, meta);
    }

    debug(message, meta) {
        this._log(LEVELS.DEBUG.name, message, meta);
    }

    info(message, meta) {
        this._log(LEVELS.INFO.name, message, meta);
    }

    warning(message, meta) {
        this._log(LEVELS.WARN.name, message, meta);
    }

    error(message, meta, error) {
        this._log(LEVELS.ERROR.name, message, meta, error);
    }

    critical(message, meta, error) {
        this._log(LEVELS.CRITICAL.name, message, meta, error);
    }

    _log(level, message, meta, error) {
        this.container.log(level, message, { meta: this._getMetaData(level, meta, error) });
    }
}

module.exports = Logger;
