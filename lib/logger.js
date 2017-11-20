'use strict';

const winston = require('winston');
const ConsoleJson = require('./transports/console-json');
const os = require('os');
const color = require('colors');
const moment = require('moment');
const stackTrace = require('stack-trace');
const loggerType = require('./consts/logger-type');
const Pluginer = require('./pluginer');
const serviceName = require(process.cwd() + '/package.json').name;
require('winston-logstash');

/**
 * config params
 * @param {object} transport - The transport that used found.
 * @param {bool} console - using console.
 * @param {logsthash} logstash - using logsthash.
 * @param {file} file - using file.
 * @param {string} logstashURL - The url that logstash found.
 * @param {string} maschineType - The typeof the machine.

 */

/**
 * options params
 * @param {object} logstash -  logstash object
 * @param {string} logstashIP - The url that logstash found.
 * @param {string} logstashPort - The port that logstash found.
 * @param {string} maschineType - The typeof the machine.

 */

const container = new Map();

class Logger {

    constructor(containerName, config, options) {
        this.verifyConfiguration(config);
        this._config = config;
        this._options = options || this._defaultOptions(config);
        this._serviceName = serviceName;
        this._containerName = containerName;
        this._options.stripColors = config.transport.fluentd === true;
        this.container = new winston.Logger(this._options);
        Logger.SetLogFromContainer(containerName, this);
        this.plugins = new Pluginer(this);
    }

    static SetLogFromContainer(containerName, logger) {
        container.set(containerName, logger);
    }

    //for compatbility
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
            })
        }
        else {
            _logger = container.get(containerName);
        }
        return _logger;
    }

    verifyConfiguration(config) {
        if (!config) {
            throw new Error('config is required');
        }
        if ((config.transport.logstash) && (!config.logstash || !config.logstash.logstashURL)) {
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

    _createTransport(config) {

        function formatter(args) {
            let component = '';
            let traceData = null;
            let logMessage = null;
            if (args.meta && args.meta.meta.component) {
                component = "( " + args.meta.meta.component + " ) ";
            }

            logMessage = `${moment().format('MMMM Do YYYY, h:mm:ss a')}  ->  ${args.level}: ${component}${args.message}`;
            if (config.extraDetails) {
                let trc = stackTrace.get();
                let trace = {
                    fileName: trc[10].getFileName(),
                    functionName: trc[10].getFunctionName(),
                    lineNumber: trc[10].getLineNumber(),
                }
                logMessage = `${logMessage}  {{ function: ${trace.functionName} file: ${trace.fileName} lineNumber: ${trace.lineNumber} }}`;
            }
            return winston.config.colorize(args.level, logMessage);
        }

        const trasnport = [];

        if (config.transport.logstash) {
            trasnport.push(new winston.transports.Logstash({
                port: config.logstash.logstashPort,
                node_name: this._containerName,
                host: config.logstash.logstashURL
            }))
        }
        if (config.transport.file) {
            trasnport.push(new winston.transports.File({
                filename: './somefile.log',
                level: 'debug',
                formatter: formatter
            }))
        }
        if (config.transport.fluentd) {
            trasnport.push(new winston.transports.ConsoleJson({ level: 'debug' }));
        }
        if (config.transport.cfluentdonsole) {
            trasnport.push(new winston.transports.Console({ level: 'debug', colorize: true, formatter: formatter }));
        }
        return trasnport;
    }

    _defaultOptions() {

        const config = {
            levels: {
                silly: 0,
                debug: 1,
                info: 2,
                warning: 3,
                error: 4,
                critical: 5
            },
            colors: {
                silly: 'white',
                debug: 'grey',
                info: 'white',
                warning: 'yellow',
                error: 'red',
                critical: 'red'
            }
        };

        const options = {
            transports: this._createTransport(this._config),
            levels: config.levels,
            colors: config.colors
        };
        return options;
    }

    _getMetaData(type, data, error) {
        data = data || {};
        let meta = null;
        let trace = null;

        if (type === 'error' || type === 'critical') {
            trace = this._getTrace(error);
        }
        if (this._config.transport.logstash) {
            meta = {
                type: this._serviceName,
                hostName: os.hostname(),
                uptime: os.uptime(),
                internal: data,
                trace: trace
            }
        }
        else if (this._config.transport.fluentd) {
            meta = {
                type: this._serviceName,
                hostName: os.hostname(),
                uptime: os.uptime(),
                internal: data,
                trace: trace,
                timestamp: new Date().getTime()
            }
        }
        else {

            meta = {
                component: data.component,
                trace: trace,
                internal: data,

            }
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

    silly(message, meta) {
        if (this._config.verbosityLevel <= loggerType.SILLY) {
            this._log('silly', message, meta);
        }
    }

    debug(message, meta) {
        if (this._config.verbosityLevel <= loggerType.DEBUG) {
            this._log('debug', message, meta);
        }
    }

    info(message, meta) {
        if (this._config.verbosityLevel <= loggerType.INFO) {
            this._log('info', message, meta);
        }
    }

    warning(message, meta) {
        if (this._config.verbosityLevel <= loggerType.WARN) {
            this._log('warning', message, meta);
        }
    }

    error(message, meta, error) {
        if (this._config.verbosityLevel <= loggerType.ERROR) {
            this._log('error', message, meta, error);
        }
    }

    critical(message, meta, error) {
        if (this._config.verbosityLevel <= loggerType.CRITICAL) {
            this._log('critical', message, meta, error);
        }
    }

    _log(type, message, meta, error) {
        this.container.log(type, message, { meta: this._getMetaData(type, meta, error) });
    }

    log(type, message, meta, error) {
        this._log(type, message, meta, error);
    }

    test(type, message, color) {
        console.log((moment().format('MMMM Do YYYY, h:mm:ss a') + "  " + type + " ==> " + message)[color])
    }
}

module.exports = Logger;
