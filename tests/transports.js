const chai = require('chai');
const expect = chai.expect;
const fse = require('fs-extra');
const sinon = require('sinon');
const readline = require('readline')
const Logger = require('../index');
const RedisFactory = require('@hkube/redis-utils').Factory;
const logsDir = 'logs-dir';
const delay = d => new Promise((r) => setTimeout(r, d));

describe('transports', () => {
    describe('file transport', () => {
        beforeEach(async () => {
            // clear logs dir
            await fse.emptyDir(logsDir);
        })
        it('should log with info level', async () => {
            const filename = `${logsDir}/info.log`;
            const relativeConfig = {
                transport: {
                    file: true
                },
                file: {
                    json: true,
                    filename: filename,
                }
            };
            const log = new Logger('test', relativeConfig);
            log.info('test info', { component: 'info-file-component' });
            await delay(10);
            const json = await fse.readFile(filename, 'utf8');
            const line = JSON.parse(json);
            expect(line.level).to.eql('info');
            expect(line.message).to.eql('test info');
        });
        it('should log with all levels', async () => {
            const filename = `${logsDir}/info.log`;
            const relativeConfig = {
                transport: {
                    file: true,
                    console: true,
                },
                file: {
                    level: 'critical',
                    json: true,
                    colors: false,
                    filename: filename,
                },
                console: {
                    json: true,
                    colors: false
                }
            };
            const log = new Logger('test', relativeConfig);
            log.trace('trace log', { component: 'trace-component' });
            log.debug('debug log', { component: 'debug-component' });
            log.info('info log', { component: 'info-component' });
            log.warning('warning log', { component: 'warning-component' });
            log.error('error log', { component: 'error-component' });
            log.critical('critical log', { component: 'critical-component' });
            await delay(50);
            const fileStream = fse.createReadStream(filename);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            const logs = [];
            for await (const line of rl) {
                const json = JSON.parse(line);
                logs.push(json);
            }
            expect(logs[0].message).to.eql('trace log');
            expect(logs[1].message).to.eql('debug log');
            expect(logs[2].message).to.eql('info log');
            expect(logs[3].message).to.eql('warning log');
            expect(logs[4].message).to.eql('error log');
            expect(logs[5].message).to.eql('critical log');
        });
    });
    describe('silent transport', () => {
        it('should be silent with no transports', () => {
            let relativeConfig = {
                transport: {
                    console: false,
                    redis: false
                }
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
                transport: {
                    console: true
                },
                console: {
                    level: 'trace',
                    format: 'logger::{level}::{message}',
                },
            };
            const log = new Logger('test', config);
            const spy = sinon.spy(log, '_log');
            log.info('format test', { component: 'test-Component' });
            const [, message] = spy.getCalls()[0].args;
            expect(message).to.contain('format test');
        });
    });
    describe('multiple transports', () => {
        it('should multiple transports ', () => {
            const useSentinel = false;
            let relativeConfig = {
                transport: {
                    console: true,
                    redis: true
                },
                redis: {
                    host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
                    port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
                    sentinel: useSentinel,
                    verbosityLevelByRedis: process.env.REDIS_VERBOSITY || true,
                    level: process.env.CLIENT_VERBOSITY || 'error'
                },
                options: {
                    extraDetails: true
                }
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
                transport: {
                    redis: true
                },
                redis: {
                    host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
                    port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
                    sentinel: useSentinel,
                    verbosityLevelByRedis: process.env.REDIS_VERBOSITY || true,
                    level: process.env.CLIENT_VERBOSITY || 'error'
                },
                options: {
                    extraDetails: true
                }
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

