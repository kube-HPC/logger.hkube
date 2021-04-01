class BaseMetadataPlugin {
    constructor(options) {
        this._options = options || {};
    }

    start() {
    }

    enrichMetadata(metadata) {
        return metadata;
    }
}

module.exports = BaseMetadataPlugin;
