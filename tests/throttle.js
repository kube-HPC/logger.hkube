

const { expect } = require('chai');
const sinon = require('sinon');
const Logger = require('../index');

describe('throttle', () => {
	it('should throttle one log only', () => {
		const config = {
			transport: {
				console: true,
				logstash: false,
				file: false
			},
			verbosityLevel: 1,
			throttle: {
				wait: 30000
			}
		};
		let log = new Logger('test', config);
		const spy = sinon.spy(log, '_log');
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
		log.throttle.error('bla');
		expect(spy.callCount).to.eql(1);
	});
});
