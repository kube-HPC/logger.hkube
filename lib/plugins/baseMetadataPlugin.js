class BaseMetadataPlugin {

    constructor(options) {
        this._options = options || {};
    }

    start(logger){

    }

    enrichMetadata(metadata){
        return metadata;
    }
}

module.exports = BaseMetadataPlugin;