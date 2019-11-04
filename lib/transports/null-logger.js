const Transport = require('winston-transport');
const winston = require('winston');
class NullLogger extends Transport {
	constructor(options) {
		super(options);
		options = options || {};
	}

	log({ level, message, meta }, callback) {
		
		callback(null, true);
	}
	
}

winston.transports.NullLogger = NullLogger;
