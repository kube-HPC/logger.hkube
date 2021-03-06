'use strict';

const winston = require('winston');
const os = require('os');
const color = require('colors');
const moment = require('moment');
const stackTrace = require('stack-trace');
const Throttle = require('./throttle');
const levels = require('./consts/levels');
const Pluginer = require('./pluginer');
const MetadataEnrichers = require('./metadataEnrichers');
const ConsoleJson = require('./transports/console-json');
require('winston-logstash');
require('./transports/redis-transport');
require('./transports/null-logger');
const container = new Map();

class Logger {
    constructor(containerName, config) {
        this.verifyConfiguration(config);
        this._config = config;
        this._serviceName = containerName;
        this._containerName = containerName;
        //	this._formatter = this._formatter.bind(this);
        this.container = new winston.createLogger({
            transports: this._createTransports(this._config),
            levels: this._createLevels(levels)
        });
        winston.addColors(this._createColors(levels));
        this.container.on('error', error => console.log(`error -${error}`));

        Logger.SetLogFromContainer(containerName, this);
        this.plugins = new Pluginer(this);
        this.metadataEnrichers = new MetadataEnrichers(this);
        if (config.throttle && config.throttle.wait) {
            this.throttle = new Throttle(this);
        }
    }

    static SetLogFromContainer(containerName, logger) {
        container.set(containerName, logger);
    }

    myFormat({ level, message, label, timestamp, meta }) {
        let component = '';
        let logMessage = null;
        if (meta && meta.component) {
            component = `(${meta.component}) `;
        }
        logMessage = `${moment().format('MMMM Do YYYY, h:mm:ss a')} -> ${level}: ${component}${message}`;

        if (this._config.extraDetails) {
            let trc = stackTrace.get();
            let trace = {
                fileName: trc[10].getFileName(),
                functionName: trc[10].getFunctionName(),
                lineNumber: trc[10].getLineNumber()
            };
            logMessage = `${logMessage}  {{ function: ${trace.functionName} file: ${trace.fileName} lineNumber: ${trace.lineNumber} }}`;
        }
        return logMessage;
    }

    // for compatibility
    static GetLogFromContanier(containerName) {
        return Logger.GetLogFromContainer(containerName);
    }

    static GetLogFromContainer(containerName) {
        let _logger = null;
        if (!container.has(containerName)) {
            container.forEach((value, key) => {
                if (value._config.isDefault) {
                    _logger = value;
                }
            });
        } else {
            _logger = container.get(containerName);
        }
        return _logger;
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
        this._config.verbosityLevel = level;
    }

    get config() {
        return this._config;
    }

    get serviceName() {
        return this._serviceName;
    }

    _createTransports(config) {
        const transports = [];
        if (config.transport.fluentd) {
            transports.push(new winston.transports.ConsoleJson({ level: 'critical' }));
        }
        if (config.transport.console) {
            transports.push(
                new winston.transports.Console({
                    level: 'critical',
                    format: winston.format.combine(winston.format.colorize(), winston.format.printf(this.myFormat.bind(this))),
                    //	colorize: true
                    //	formatter: this._formatter
                })
            );
        }
        if (config.transport.redis) {
            transports.push(
                new winston.transports.RedisTransport({
                    level: config.redis.clientVerbosity,
                    serviceName: this._containerName,
                    redis: this._config.redis,
                    onConfigChange: level => (this._config.verbosityLevel = level)
                })
            );
        }
        if (transports.length === 0) {
            transports.push(new winston.transports.NullLogger())
        }
        return transports;
    }

    _createLevels() {
        const obj = Object.create(null);
        Object.values(levels).forEach(v => {
            obj[v.name] = v.level;
        });
        return obj;
    }

    _createColors() {
        const obj = Object.create(null);
        Object.values(levels).forEach(v => {
            obj[v.name] = v.color;
        });
        return obj;
    }

    _getMetaData(type, data, error) {
        data = data || {};
        let meta = null;
        let trace = null;

        data = this.metadataEnrichers.enrichMetadata(data);

        if (type === 'error' || type === 'critical') {
            trace = this._getTrace(error);
        }
        if (this._config.transport.fluentd) {
            meta = {
                type: this._serviceName,
                hostName: os.hostname(),
                uptime: os.uptime(),
                internal: data,
                trace: trace,
                timestamp: Date.now()
            };
        } else if (this._config.transport.redis) {
            meta = {
                timestamp: Date.now()
            };
        } else {
            meta = {
                component: data.component,
                trace: trace,
                internal: data
            };
        }
        return meta;
    }

    _getTrace(err) {
        const traces = [];
        const stack = err ? stackTrace.parse(err) : stackTrace.get();
        stack.forEach(function (site) {
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
        if (this._config.verbosityLevel <= levels.TRACE.level) {
            this._log(levels.TRACE.name, message, meta);
        }
    }

    silly(message, meta) {
        if (this._config.verbosityLevel <= levels.SILLY.level) {
            this._log(levels.SILLY.name, message, meta);
        }
    }

    debug(message, meta) {
        if (this._config.verbosityLevel <= levels.DEBUG.level) {
            this._log(levels.DEBUG.name, message, meta);
        }
    }

    info(message, meta) {
        if (this._config.verbosityLevel <= levels.INFO.level) {
            this._log(levels.INFO.name, message, meta);
        }
    }

    warning(message, meta) {
        if (this._config.verbosityLevel <= levels.WARN.level) {
            this._log(levels.WARN.name, message, meta);
        }
    }

    error(message, meta, error) {
        if (this._config.verbosityLevel <= levels.ERROR.level) {
            this._log(levels.ERROR.name, message, meta, error);
        }
    }

    critical(message, meta, error) {
        if (this._config.verbosityLevel <= levels.CRITICAL.level) {
            this._log(levels.CRITICAL.name, message, meta, error);
        }
    }

    _log(type, message, meta, error) {
        this.container.log(type, message, { meta: { meta: this._getMetaData(type, meta, error) } });
    }
}

module.exports = Logger;
