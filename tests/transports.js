const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Logger = require('../index');
const RedisFactory = require('@hkube/redis-utils').Factory;

describe('transports', () => {
	before(() => {
		// clear data dir
	})
	describe('file transport', () => {
		it.skip('should log with info level', () => {
			const relativeConfig = {
				transport: {
					file: true
				},
				fileTransport: {
					level: null,
					silent: false,
					eol: null,
					filename: 'data/info.log',
					maxsize: 10000,
					maxFiles: 1000,
					tailable: true,
					maxRetries: 2,
					zippedArchive: false,
					options: { flags: 'a' },
				},
				verbosityLevel: 2,
				isDefault: true
			};
			const log = new Logger('test', relativeConfig);
			log.info('hi info test', { component: 'info-file-component' });
			expect(msg).to.contain('hi info test');
		});
	});
	describe('silent transport', () => {
		it('should be silent with no transports', () => {
			let relativeConfig = {
				machineType: 'test',
				transport: {
					fluentd: false,
					console: false,
					redis: false
				},
				verbosityLevel: 2,
				isDefault: true
			};
			let log = new Logger('test', relativeConfig);
			const spy = sinon.spy(log, '_log');

			log.info('hi info test', { component: 'test-Component' });
			const [level, msg] = spy.getCalls()[0].args;
			expect(msg).to.contain('hi info test');
		});
	});
	describe('format transport', () => {
		it('should log with format ', () => {
			const config = {
				format: 'logger::{level}::{message}',
				verbosityLevel: 1,
				enableColors: false,
				transport: {
					console: true
				}
			};
			const log = new Logger('test', config);
			const spy = sinon.spy(log, '_log');
			log.info('format test', { component: 'test-Component' });
			const [, message] = spy.getCalls()[0].args;
			expect(message).to.contain('format test');
		});
	});
	describe('fluentd transport', () => {
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
			const { message, meta } = spy.getCalls()[0].args[0];
			expect(message).to.contain('hi info test');
			expect(meta.meta.internal.component).to.eql('test-Component')
		});
	});
	describe('multiple transports', () => {
		it('should multiple transports ', () => {
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
			log.info('hi info test', { component: 'test-Component' });
			const [level, msg] = spy.getCalls()[0].args;
			expect(msg).to.contain('hi info test');
		});
	});
	describe('redis transport', () => {
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
	})
});

