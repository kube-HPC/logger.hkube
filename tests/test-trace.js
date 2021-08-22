const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Logger = require('../index');

describe('test-trace', () => {
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
});

