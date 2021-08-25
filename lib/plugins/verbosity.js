const RedisFactory = require('@hkube/redis-utils').Factory;
const PubSubAdapter = require('@hkube/pub-sub-adapter');
const BasePlugin = require('./basePlugin');
const levels = require('../consts/levels');
const TOPIC = 'logger-api-trace-level';
let uniqueKey;
let client;

class VerbosityPlugin extends BasePlugin {
    constructor(options) {
        super();
        this._options = options;
    }

    start(logger) {
        if (!this._options.host) {
            throw new Error('Verbosity plugin requires redis config');
        }
        uniqueKey = `${TOPIC}-${logger.serviceName}`;
        client = RedisFactory.getClient(this._options);

        this._loadVerbosityLevel().then((data) => {
            if (data && data.level) {
                logger.updateTraceLevel(data.level);
            }
        });
        this._pubSubAdapter = new PubSubAdapter({
            host: this._options.host,
            port: this._options.port,
            sentinel: this._options.sentinel
        });
        this._pubSubAdapter.on('error', () => {
        });
        this._pubSubAdapter.requestReplySubscribe(`${uniqueKey}-set`, (data, callback) => {
            if (!data || data.level == null) {
                return callback({ error: 'debug level is missing' });
            }
            let found = false;
            Object.keys(levels).forEach((l) => {
                const { level } = levels[l];
                if (data.level === level) {
                    found = true;
                }
            });
            if (!found) {
                return callback({ error: `debug level is invalid(${data.level})` });
            }
            return client.set(uniqueKey, JSON.stringify({ level: data.level }), (err) => {
                if (err) {
                    return callback({ error: 'unable to save debug level' });
                }
                logger.updateTraceLevel(data.level);
                return callback({ data: 'ok' });
            });
        });
        this._pubSubAdapter.requestReplySubscribe(`${uniqueKey}-get`, (data, callback) => {
            return callback({ data: logger.config.verbosityLevel });
        });
    }

    _loadVerbosityLevel() {
        return new Promise((resolve, reject) => {
            client.get(uniqueKey, (err, res) => {
                if (err) {
                    return reject(err);
                }
                return resolve(JSON.parse(res));
            });
        });
    }
}

module.exports = VerbosityPlugin;
