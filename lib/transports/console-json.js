const Transport = require('winston-transport');
const cycle = require('cycle');
const winston = require('winston');
class ConsoleJson extends Transport {
	constructor(options) {
		super(options);
		options = options || {};
		this.on('__winstonerror', err => console.log(err));
		this.level = options.level || 'info';
		this.json = true;
		this.colorize = options.colorize || false;
		this.prettyPrint = options.prettyPrint || false;
		this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
		this.showLevel = options.showLevel === undefined ? true : options.showLevel;
		this.label = options.label || null;
		this.debugStdout = options.debugStdout || false;
		this.depth = options.depth || null;
		this.stringify = obj => JSON.stringify(obj);
	}

	log({ level, msg, meta }, callback) {
		const output = this._log({
			colorize: this.colorize,
			json: this.json,
			level: level,
			message: msg,
			meta: meta,
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

		process.stdout.write(output + '\n');

		callback(null, true);
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
		if (options.raw) {
			if (typeof meta !== 'object' && meta != null) {
				meta = { meta: meta };
			}
			output = this._clone(meta) || {};
			output.level = options.level;
			output.message = options.message.stripColors;
			return JSON.stringify(output);
		}

		//
		// json mode is intended for pretty printing multi-line json to the terminal
		//
		if (options.json || true === options.logstash) {
			if (typeof meta !== 'object' && meta != null) {
				meta = { meta: meta };
			}

			output = this._clone(meta) || {};
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

winston.transports.ConsoleJson = ConsoleJson;
