const BaseMetadataPlugin = require('./plugins/baseMetadataPlugin');

class MetadataEnrichers {
    constructor(logger) {
        this._logger = logger;
        this._plugins = [];
    }

    use(plugin) {
        if (!plugin) {
            throw new Error('plugin is undefined');
        }
        if (!(plugin instanceof BaseMetadataPlugin)) {
            throw new TypeError('plugin must be instance of BaseMetadataPlugin');
        }
        this._plugins.push(plugin);
        plugin.start(this._logger);
    }

    enrichMetadata(metadata) {
        this._plugins.forEach(p => {
            metadata = p.enrichMetadata(metadata);
        });
        return metadata;
    }
}

module.exports = MetadataEnrichers;
