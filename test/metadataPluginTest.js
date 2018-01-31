const chai = require("chai");
const expect = chai.expect;
const Logger = require('../index');
const MetadataPlugin = require('../index').MetadataPlugin
const intercept = require('intercept-stdout');

const config = {
    transport: {
        console: false,
        fluentd: true,
        logstash: false,
        file: false
    },
    extraDetails: false,
    verbosityLevel: 1,
    isDefault: true
};

describe('Metadata enrichment plugin', () => {
    it('should create plugin with empty options', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin();
        log.plugins.use(plugin);
        expect(plugin._options).to.be.empty
    });
    it('should create plugin with options', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ x: 1 });
        log.plugins.use(plugin);
        expect(plugin._options).to.eql({ x: 1 })
    });
    it('should check that enrichCallback is a function', () => {
        const log = new Logger('test1', config);
        expect(() => new MetadataPlugin({ enrichCallback: 'not a function' })).to.throw('enrichCallback should be a function');
    });

    it('should save enrichCallback when it is a function', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ enrichCallback: (metadata) => metadata });
        log.plugins.use(plugin);
        expect(plugin._enrichCallback).to.not.be.undefined;
    });

    it('should not change log', (done) => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ enrichCallback: (metadata) => metadata });
        log.plugins.use(plugin);

        const unhook = intercept((stdout) => {
            const msg = JSON.parse(stdout);
            expect(msg.message).to.include('the message')
            expect(msg.meta.internal).to.eql({ meta1: 'meta1' })
            unhook();
            done();
        })
        log.info('the message', { meta1: 'meta1' });
    });

    it('should add metadata', (done) => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({
            enrichCallback: (metadata) => ({
                ...metadata, ...{ meta2: 'meta2' }
            })
        });
        log.plugins.use(plugin);

        const unhook = intercept((stdout) => {
            const msg = JSON.parse(stdout);
            expect(msg.message).to.include('the message')
            expect(msg.meta.internal).to.eql({ meta1: 'meta1',meta2: 'meta2' })
            unhook();
            done();
        })
        log.info('the message', { meta1: 'meta1' });
    });
});
