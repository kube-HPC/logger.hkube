/*
 * Created by nassi on 08/02/17.
 */
class BasePlugin {
    constructor(options) {
        this._options = options || {};
    }

    start() {
    }
}

module.exports = BasePlugin;
