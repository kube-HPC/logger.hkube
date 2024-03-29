/*
 * Created by nassi on 02/02/17.
 */

const BasePlugin = require('./plugins/basePlugin');

class Pluginer {
    constructor(logger) {
        this._logger = logger;
        this._plugins = new Map();
    }

    use(plugin) {
        if (!plugin) {
            throw new Error('plugin is undefined');
        }
        if (this._plugins.has(plugin.constructor.name)) {
            throw new Error('plugin is already registered');
        }
        if (!(plugin instanceof BasePlugin)) {
            throw new TypeError('plugin must be instance of plugin');
        }
        this._plugins.set(plugin.constructor.name, plugin);
        plugin.start(this._logger);
    }
}

module.exports = Pluginer;
