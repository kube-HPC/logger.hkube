/**
 * Created by maty2_000 on 8/13/2015.
 */
'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');
var Logger = require('../index');
var VerbosityPlugin = require('../index').VerbosityPlugin;
var intercept = require('intercept-stdout');
var PubSubAdapter = require('@hkube/pub-sub-adapter');
const RedisFactory = require('@hkube/redis-utils').Factory;
var moment = require('moment');

var redisConfig = {
	host: 'localhost',
	port: 6379
};
var pubSubAdapter = new PubSubAdapter(redisConfig);

var config = {
	transport: {
		console: true,
		fluentd: false,
		logstash: false,
		file: false
	},
	logstash: {
		logstashURL: '127.0.0.1',
		logstashPort: 28777
	},
	extraDetails: false,
	verbosityLevel: 1,
	isDefault: true
};
describe('transports', () => {
	it('should multiple transports ', () => {
		// let intercetptInstance = intercept(stdout => {

		// 	intercetptInstance();
		// 	done();
		// });
		const useSentinel = false;
		let relativeConfig = {
			machineType: 'test',
			transport: {
				fluentd: true,
				console: true,
				redis: true
			},
			redis: {
				host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
				port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
				sentinel: useSentinel,
				verbosityLevelByRedis: process.env.REDIS_VERBOSITY || true,
				clientVerbosity: process.env.CLIENT_VERBOSITY || 'error'
			},
			extraDetails: true,
			verbosityLevel: 2,
			isDefault: true
		};
		let log = new Logger('test', relativeConfig);
		const spy = sinon.spy(log, '_log');

		//		const spy = sinon.spy(log, '_log');
		//let logObj = '';
		// let intercetptInstance = intercept(stdout => {
		// 	logObj = stdout;
		// });
		log.info('hi info test', { component: 'test-Component' });
		const [level, msg] = spy.getCalls()[0].args;
		expect(msg).to.contain('hi info test');
		//const [level, msg] = spy.getCalls()[0].args;
	});
	it('should fluentd ', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				fluentd: true
			},

			extraDetails: true,
			verbosityLevel: 2,
			isDefault: true
		};
		let log = new Logger('test', relativeConfig);

		const spy = sinon.spy(log.container.transports[0], '_log');

		log.info('hi info test', { component: 'test-Component' });
		const {message, meta} = spy.getCalls()[0].args[0];
		expect(message).to.contain('hi info test');
		expect(meta.internal.component).to.eql('test-Component')
	});

	it('should redis', done => {
		const useSentinel = false;
		let relativeConfig = {
			machineType: 'test',
			transport: {
				redis: true
			},
			redis: {
				host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
				port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
				sentinel: useSentinel,
				verbosityLevelByRedis: process.env.REDIS_VERBOSITY || true,
				clientVerbosity: process.env.CLIENT_VERBOSITY || 'error'
			},
			extraDetails: true,
			verbosityLevel: 2,

			isDefault: true
		};
		const redisClient = RedisFactory.getClient(relativeConfig.redis);
		let log = new Logger('test', relativeConfig);
		let logObj = '';

		setTimeout(async () => {
			try {
				const logObj = await redisClient.lrange('hkube:logs:all', 0, 0);
				expect(JSON.parse(logObj[0]).message).to.contain('hi info test');
				done();
			} catch (error) {
				console.log(`error-${error}`);
			}
		}, 1000);

		log.error('hi info test', { component: 'test-Component' });
	});
});
xdescribe('Plugins', () => {
	const TOPIC_SET = 'rms-logger-api-trace-level-logger-set';
	const TOPIC_GET = 'rms-logger-api-trace-level-logger-get';

	it('should throw error when plugin is undefined', done => {
		expect(function() {
			let log = new Logger('test', config);
			log.plugins.use(null);
		}).to.throw(Error, 'plugin is undefined');
		done();
	});
	it('should throw error when plugin is not instance of plugin', done => {
		expect(function() {
			let log = new Logger('test', config);
			log.plugins.use({ test: 'bla' });
		}).to.throw(TypeError, 'plugin must be instance of plugin');
		done();
	});
	it('should throw error on duplicate plugin registration', done => {
		expect(function() {
			let log = new Logger('test', config);
			log.plugins.use(new VerbosityPlugin(redisConfig));
			log.plugins.use(new VerbosityPlugin(redisConfig));
		}).to.throw(Error, 'plugin is already registered');
		done();
	});
	it('should not update verbosity level if not exists', done => {
		let log = new Logger('test', config);
		log.plugins.use(new VerbosityPlugin(redisConfig));

		setTimeout(() => {
			pubSubAdapter.requestReply(TOPIC_SET, null).then(response => {
				expect(response.error).to.equal('debug level is missing');
				done();
			});
		}, 1000);
	});
	it('should not update verbosity level if not supplied', done => {
		let log = new Logger('test', config);
		log.plugins.use(new VerbosityPlugin(redisConfig));

		setTimeout(() => {
			pubSubAdapter.requestReply(TOPIC_SET, { level: null }).then(response => {
				expect(response.error).to.equal('debug level is missing');
				done();
			});
		}, 1000);
	});
	it('should not update verbosity level if not valid', done => {
		let log = new Logger('test', config);
		log.plugins.use(new VerbosityPlugin(redisConfig));

		setTimeout(() => {
			pubSubAdapter.requestReply(TOPIC_SET, { level: 500 }).then(response => {
				expect(response.error).to.equal(`debug level is invalid (500)`);
				done();
			});
		}, 1000);
	});
	it('should update verbosity level', done => {
		let log = new Logger('test', config);
		log.plugins.use(new VerbosityPlugin(redisConfig));

		setTimeout(() => {
			pubSubAdapter.requestReply(TOPIC_SET, { level: 0 }).then(response => {
				expect(response.data).to.equal('ok');

				pubSubAdapter.requestReply(TOPIC_GET).then(response => {
					expect(response.data).to.equal(0);
					done();
				});
			});
		}, 1000);
	});
});
describe('colors', () => {
	it('should print in colors', () => {
		const config = {
			transport: {
				console: true
			},
			verbosityLevel: 0
		};
		const log = new Logger('test', config);
		log.silly('bla', { component: 'MAIN' });
		log.trace('trace', { component: 'MAIN' });
		log.info('info', { component: 'MAIN' });
		log.debug('debug', { component: 'MAIN' });
		log.warning('warning', { component: 'MAIN' });
		log.error('error', { component: 'MAIN' });
		log.critical('critical', { component: 'MAIN' });
	});
});
xdescribe('throttle', () => {
	it('should-call-error', done => {
		var config = {
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			verbosityLevel: 1,
			throttle: {
				wait: 30000
			}
		};
		let log = new Logger('test', config);
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
	});
});
describe('sanity-check', () => {
	it('should-call-debug', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		// let intercetptInstance = intercept(stdout => {

		// 	intercetptInstance();
		// 	done();
		// });
		log.debug('hi debug test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('debug');
		expect(msg).to.contain('hi debug test');
	});
	it('should-call-info', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		log.info('hi info test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('info');
		expect(msg).to.contain('hi info test');
	});
	it('should-call-warning', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		log.warning('hi warning test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('warning');
		expect(msg).to.contain('hi warning test');
	});
	it('should-call-error', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		// let intercetptInstance = intercept((stdout, stderr) => {

		// 	intercetptInstance();
		// 	done();
		// });
		log.error('hi error test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('error');
		expect(msg).to.contain('hi error test');
	});
	it('should-call-critical', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		// let intercetptInstance = intercept((stdout, stderr) => {
		// 	expect(stdout).to.contain('critical');
		// 	expect(stdout).to.contain('hi critical test');
		// 	intercetptInstance();
		// 	done();
		// });
		log.critical('hi critical test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('critical');
		expect(msg).to.contain('hi critical test');
	});
});
xdescribe('test-formating', () => {
	beforeEach(() => {
		let log = new Logger('test', config);
	});
	it('should-contain-format', () => {
		const spy = sinon.spy(log, '_log');
		let intercetptInstance = intercept(stdout => {
			expect(stdout).to.contain('m  ->');
			expect(stdout).to.contain('info:');
			intercetptInstance();
			//	done();
		});
		log.info('hi info test');
	});
	it('should-contain-date-format', () => {
		const spy = sinon.spy(log, '_log');

		log.info('hi info test');
	});
	it('component-name', done => {
		const spy = sinon.spy(log, '_log');
		let intercetptInstance = intercept(stdout => {
			expect(stdout).to.contain('( test-Component )');
			intercetptInstance();
			done();
		});
		log.info('hi info test', { component: 'test-Component' });
	});
	afterEach(() => {});
});
describe('extra-details', () => {
	xit('extra-details-flag-on', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: true,
			verbosityLevel: 1
		};
		let log = new Logger('test', relativeConfig);
		const spy = sinon.spy(log, '_log');
		// let intercetptInstance = intercept(stdout => {
		// 	expect(stdout).to.contain('{{');
		// 	//	expect(stdout).to.contain('test.js');
		// 	expect(stdout).to.contain('lineNumber:');
		// 	intercetptInstance();
		// 	done();
		// });
		log.info('hi info test', { component: 'test-Component' });
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('{{');
		expect(msg).to.contain('lineNumber:');
	});
	xit('extra-details-flag-off', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: false,
			verbosityLevel: 1,
			isDefault: true
		};
		const spy = sinon.spy(log, '_log');

		let log = new Logger('test', relativeConfig);
		let intercetptInstance = intercept(stdout => {
			expect(stdout).to.not.contain('{{');
			expect(stdout).to.not.contain('test.js');
			expect(stdout).to.not.contain('lineNumber:');
			intercetptInstance();
			done();
		});
		log.info('hi info test', { component: 'test-Component' });
	});
	afterEach(() => {});
});
describe('test-trace', () => {
	beforeEach(() => {});
	it('should-not-contain-log-info-message', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: true,
			verbosityLevel: 4,
			isDefault: true
		};
		let log = new Logger('test', relativeConfig);
		const spy = sinon.spy(log, '_log');
		log.info('hi info test', { component: 'test-Component' });
		const data = spy.getCalls()[0];
		expect(data).to.be.undefined;
	});
	it('should-contain-log-info-message', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: true,
			verbosityLevel: 2,
			isDefault: true
		};
		let log = new Logger('test', relativeConfig);
		const spy = sinon.spy(log, '_log');
		log.info('hi info test', { component: 'test-Component' });
		const [level, msg] = spy.getCalls()[0].args;
		expect(msg).to.contain('hi info test');
	});
	it('should-update-trace-level-during-run', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: true,
			verbosityLevel: 4,
			isDefault: true
		};
		let log = new Logger('test', relativeConfig);
		const spy = sinon.spy(log, '_log');
		// first testing that not received
		log.info('hi info test', { component: 'test-Component' });
		const data = spy.getCalls().args;
		expect(data).to.be.undefined;
		log.updateTraceLevel(1);
		spy.restore();
		const spy2 = sinon.spy(log, '_log');
		log.info('hi info test', { component: 'test-Component' });
		const [level2, msg2] = spy2.getCalls()[0].args;
		expect(msg2).to.contain('hi info test');
	});
	afterEach(() => {});
});
describe('container', () => {
	beforeEach(() => {});
	it('get-without-container-name', () => {
		let relativeConfig = {
			machineType: 'test',
			transport: {
				console: true,
				fluentd: false,
				logstash: false,
				file: false
			},
			logstash: {
				logstashURL: '127.0.0.1',
				logstashPort: 28777
			},
			extraDetails: true,
			verbosityLevel: 2,
			isDefault: true
		};
		let logger = new Logger('test', relativeConfig);
		let log = Logger.GetLogFromContainer();
		const spy = sinon.spy(log, '_log');
		log.info('hi info test', { component: 'test-Component' });
		const [level, msg] = spy.getCalls()[0].args;
		expect(msg).to.contain('hi info test');
	});
	afterEach(() => {});
});
