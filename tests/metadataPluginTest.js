const chai = require('chai');
const expect = chai.expect;
const Logger = require('../index');
const MetadataPlugin = require('../index').MetadataPlugin;
const VerbosityPlugin = require('../index').VerbosityPlugin;

const config = {
    transport: {
        console: false,
        logstash: false,
        file: false
    },
    options: {
        extraDetails: false,
        isDefault: true
    }
};

describe('Metadata enrichment plugin', () => {
    it('should create plugin with empty options', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin();
        log.metadataEnrichers.use(plugin);
        expect(plugin._options).to.be.empty;
    });
    it('should check base class', () => {
        const log = new Logger('test1', config);
        const plugin = new VerbosityPlugin();
        expect(() => log.metadataEnrichers.use(plugin)).to.throw('plugin must be instance of BaseMetadataPlugin');
    });
    it('should create plugin with options', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ x: 1 });
        log.metadataEnrichers.use(plugin);
        expect(plugin._options).to.eql({ x: 1 });
    });
    it('should check that enrichCallback is a function', () => {
        const log = new Logger('test1', config);
        expect(() => new MetadataPlugin({ enrichCallback: 'not a function' })).to.throw('enrichCallback should be a function');
    });
    it('should save enrichCallback when it is a function', () => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ enrichCallback: metadata => metadata });
        log.metadataEnrichers.use(plugin);
        expect(plugin._enrichCallback).to.not.be.undefined;
    });
    xit('should not change log', done => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({ enrichCallback: metadata => metadata });
        log.metadataEnrichers.use(plugin);

        const unhook = intercept(stdout => {
            const msg = JSON.parse(stdout);
            expect(msg.message).to.include('the message');
            expect(msg.meta.internal).to.eql({ meta1: 'meta1' });
            unhook();
            done();
        });
        log.info('the message', { meta1: 'meta1' });
    });

    xit('should add metadata', done => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({
            enrichCallback: metadata => ({
                ...metadata,
                ...{ meta2: 'meta2' }
            })
        });
        log.metadataEnrichers.use(plugin);

        const unhook = intercept(stdout => {
            const msg = JSON.parse(stdout);
            expect(msg.message).to.include('the message');
            expect(msg.meta.internal).to.eql({ meta1: 'meta1', meta2: 'meta2' });
            unhook();
            done();
        });
        log.info('the message', { meta1: 'meta1' });
    });
    xit('should add metadata with 2 plugins', done => {
        const log = new Logger('test1', config);
        const plugin = new MetadataPlugin({
            enrichCallback: metadata => ({
                ...metadata,
                ...{ meta2: 'meta2' }
            })
        });
        log.metadataEnrichers.use(plugin);
        const plugin2 = new MetadataPlugin({
            enrichCallback: metadata => ({
                ...metadata,
                ...{ meta3: 'meta3' }
            })
        });
        log.metadataEnrichers.use(plugin2);
        const unhook = intercept(stdout => {
            const msg = JSON.parse(stdout);
            expect(msg.message).to.include('the message');
            expect(msg.meta.internal).to.eql({ meta1: 'meta1', meta2: 'meta2', meta3: 'meta3' });
            unhook();
            done();
        });
        log.info('the message', { meta1: 'meta1' });
    });
});
