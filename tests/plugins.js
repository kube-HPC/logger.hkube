const chai = require('chai');
const expect = chai.expect;
const Logger = require('../index');
const VerbosityPlugin = require('../index').VerbosityPlugin;
const PubSubAdapter = require('@hkube/pub-sub-adapter');

const redisConfig = {
    host: 'localhost',
    port: 6379
};
const pubSubAdapter = new PubSubAdapter(redisConfig);

const config = {
    transport: {
        console: true,
        logstash: false,
        file: false
    },
    logstash: {
        logstashURL: '127.0.0.1',
        logstashPort: 28777
    },
    options: {
        extraDetails: false,
        verbosityLevel: 1,
        isDefault: true
    }
};

xdescribe('Plugins', () => {
    const TOPIC_SET = 'logger-api-trace-level-logger-set';
    const TOPIC_GET = 'logger-api-trace-level-logger-get';

    it('should throw error when plugin is undefined', done => {
        expect(function () {
            let log = new Logger('test', config);
            log.plugins.use(null);
        }).to.throw(Error, 'plugin is undefined');
        done();
    });
    it('should throw error when plugin is not instance of plugin', done => {
        expect(function () {
            let log = new Logger('test', config);
            log.plugins.use({ test: 'bla' });
        }).to.throw(TypeError, 'plugin must be instance of plugin');
        done();
    });
    it('should throw error on duplicate plugin registration', done => {
        expect(function () {
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
