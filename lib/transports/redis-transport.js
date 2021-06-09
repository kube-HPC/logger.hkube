const RedisFactory = require('@hkube/redis-utils').Factory;
const winston = require('winston');
const cycle = require('cycle');
const os = require('os');
const uuid = require('uuid').v4;
const { biggerLevelOperator } = require('../levelsOperations');

class RedisTransport extends winston.Transport {
    constructor(options) {
        super(options);
        options = options || {};
        this.redisClient = RedisFactory.getClient(options.redis);
        this.redisClient.on('error', () => { });
        this.level = options.level || 'error';
        this.json = true;
        this.colorize = options.colorize || false;
        this.prettyPrint = options.prettyPrint || false;
        this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
        this.showLevel = options.showLevel === undefined ? true : options.showLevel;
        this.label = options.label || null;
        this.debugStdout = options.debugStdout || false;
        this.depth = options.depth || null;
        this.containerName = options.containerName || 'Test';
        this.prefix = options.prefix || 'hkube:logs';
        this.redisKey = `${this.prefix}:all`;
        this.sizeAmount = (options.sizeAmount || 100) - 1;
        this.podName = os.hostname();
        this.stringify = obj => JSON.stringify(obj);
        this._verbosityInterval();
        this.onConfigChangeCallBack = options.onConfigChange;
        this.intervalTime = options.intervalTime || 10000;
        this.serviceName = options.serviceName;
    }

    _verbosityInterval() {
        setTimeout(async () => {
            try {
                if (this.onConfigChangeCallBack) {
                    const logVerbosityLevel = await this.redisClient.get(`${this.prefix}:consoleVerbosity`);
                    if (logVerbosityLevel) {
                        this.onConfigChangeCallBack(logVerbosityLevel);
                    }
                }
                const redisLevel = await this.redisClient.get(`${this.prefix}:clientVerbosity`);
                this.level = redisLevel ? redisLevel : this.level;
            }
            catch (error) {
                console.error(`failed to access redis error:${error}`);
            }
            finally {
                this._verbosityInterval();
            }
        }, this.intervalTime);
    }

    log({ level, message, meta }, callback) {
        if (biggerLevelOperator(level, this.level)) {
            const output = this._log({
                colorize: this.colorize,
                json: this.json,
                level,
                message,
                meta: { ...meta.meta, serviceName: this.serviceName, podName: this.podName },
                stringify: this.stringify,
                timestamp: this.timestamp,
                showLevel: this.showLevel,
                prettyPrint: this.prettyPrint,
                raw: this.raw,
                label: this.label,
                logstash: this.logstash,
                depth: this.depth,
                formatter: this.formatter,
                humanReadableUnhandledException: this.humanReadableUnhandledException
            });

            this._sendToRedis(output);
        }
        callback(null, true);
    }

    _sendToRedis(output) {
        this.redisClient
            .lpush(this.redisKey, output)
            .then(() => {
                this.redisClient.ltrim(this.redisKey, 0, this.sizeAmount);
            })
            .catch(error => {
                console.log(error);
            });
    }

    _log(options) {
        var timestampFn = typeof options.timestamp === 'function' ? options.timestamp : this._timestamp,
            timestamp = options.timestamp ? timestampFn() : null,
            showLevel = options.showLevel === undefined ? true : options.showLevel,
            meta = options.meta !== null && options.meta !== undefined && !(options.meta instanceof Error) ? this._clone(cycle.decycle(options.meta)) : options.meta || null,
            output;

        //
        // raw mode is intended for outputing winston as streaming JSON to STDOUT
        //

        //
        // json mode is intended for pretty printing multi-line json to the terminal
        //
        if (options.json) {
            if (typeof meta !== 'object' && meta != null) {
                meta = { meta: meta };
            }
            const { trace, internal, component, ...metaCleaned } = meta;
            output = this._clone(metaCleaned) || {};
            output.id = uuid();
            output.level = options.level;
            output.message = output.message || '';

            if (options.label) {
                output.label = options.label;
            }
            if (options.message) {
                output.message = options.message;
            }
            if (timestamp) {
                output.timestamp = timestamp;
            }

            if (typeof options.stringify === 'function') {
                return options.stringify(output);
            }
        }
    }

    _timestamp() {
        return new Date().toISOString();
    }

    _clone(obj) {
        //
        // We only need to clone reference types (Object)
        //
        if (obj instanceof Error) {
            return obj;
        } else if (!(obj instanceof Object)) {
            return obj;
        } else if (obj instanceof Date) {
            return obj;
        }

        var copy = {};
        for (var i in obj) {
            if (Array.isArray(obj[i])) {
                copy[i] = obj[i].slice(0);
            } else if (obj[i] instanceof Buffer) {
                copy[i] = obj[i].slice(0);
            } else if (typeof obj[i] != 'function') {
                copy[i] = obj[i] instanceof Object ? this._clone(obj[i]) : obj[i];
            } else if (typeof obj[i] === 'function') {
                copy[i] = obj[i];
            }
        }

        return copy;
    }
}

winston.transports.RedisTransport = RedisTransport;
