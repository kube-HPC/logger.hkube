const Logger = require('../index');

describe('colors', () => {
    it('should print in colors', () => {
        const config = {
            transport: {
                console: true,
                level: 'trace'
            }
        };
        const log = new Logger('test', config);
        log.trace('trace', { component: 'MAIN' });
        log.info('info', { component: 'MAIN' });
        log.debug('debug', { component: 'MAIN' });
        log.warning('warning', { component: 'MAIN' });
        log.error('error', { component: 'MAIN' });
        log.critical('critical', { component: 'MAIN' });
    });
});