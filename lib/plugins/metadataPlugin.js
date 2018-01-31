const BasePlugin = require('./basePlugin');

class MetadataPlugin extends BasePlugin {
    constructor(options) {
        super(options);
        if (this._options.enrichCallback && typeof(this._options.enrichCallback) !== 'function'){
            throw new Error('enrichCallback should be a function')
        }
        this._enrichCallback = this._options.enrichCallback;
    }

    start(logger) {

    }

    enrichMetadata(metadata) {
        if (!this._enrichCallback){
            return metadata;
        }
        return this._enrichCallback(metadata);
    }
}

module.exports = MetadataPlugin;