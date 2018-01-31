/*
 * Created by nassi on 08/02/17.
 */

'use strict';

class BasePlugin {

    constructor(options) {
        this._options = options || {};
    }

    start(logger){

    }

    enrichMetadata(metadata){
        return metadata;
    }
}

module.exports = BasePlugin;