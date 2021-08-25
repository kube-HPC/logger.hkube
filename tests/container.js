const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Logger = require('../index');

describe('container', () => {
    it('get-without-container-name', () => {
        let relativeConfig = {
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
                extraDetails: true,
            }
        };
        let logger = new Logger('test', relativeConfig);
        let log = Logger.GetLogFromContainer();
        const spy = sinon.spy(log, '_log');
        log.info('hi info test', { component: 'test-Component' });
        const [level, msg] = spy.getCalls()[0].args;
        expect(msg).to.contain('hi info test');
    });
});
