
const chai = require('chai');
const Logger = require('../index');

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