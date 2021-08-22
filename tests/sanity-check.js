const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Logger = require('../index');

const config = {
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

describe('sanity-check', () => {
	it('should-call-debug', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
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
		log.error('hi error test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('error');
		expect(msg).to.contain('hi error test');
	});
	it('should-call-critical', () => {
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		log.critical('hi critical test');
		const [level, msg] = spy.getCalls()[0].args;
		expect(level).to.contain('critical');
		expect(msg).to.contain('hi critical test');
	});
});
