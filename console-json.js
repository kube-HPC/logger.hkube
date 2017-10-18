/*
 * console.js: Transport for outputting to the console
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 */

var events = require('events'),
    util = require('util'),
    common = require('../common'),
    Transport = require('./transport').Transport;

//
// ### function Console (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Console transport object responsible
// for persisting log messages and metadata to a terminal or TTY.
//
var ConsoleJson = exports.ConsoleJson = function (options) {
    Transport.call(this, options);
    options = options || {};

    this.json = options.json || false;
    this.colorize = options.colorize || false;
    this.prettyPrint = options.prettyPrint || false;
    this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
    this.showLevel = options.showLevel === undefined ? true : options.showLevel;
    this.label = options.label || null;
    this.logstash = options.logstash || false;
    this.debugStdout = options.debugStdout || false;
    this.depth = options.depth || null;

    if (this.json) {
        this.stringify = options.stringify || function (obj) {
                return JSON.stringify(obj);
            };
    }
};

//
// Inherit from `winston.Transport`.
//
util.inherits(ConsoleJson, Transport);

//
// Expose the name of this Transport on the prototype
//
ConsoleJson.prototype.name = 'consoleJson';

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
ConsoleJson.prototype.log = function (level, msg, meta, callback) {
    if (this.silent) {
        return callback(null, true);
    }

    var self = this,
        output;

    output = common.log({
        colorize: this.colorize,
        json: this.json,
        level: level,
        message: msg,
        meta: meta,
        stringify: this.stringify,
        timestamp: this.timestamp,
        showLevel: this.showLevel,
        prettyPrint: this.prettyPrint,
        raw: this.raw,
        label: this.label,
        logstash: this.logstash,
        depth: this.depth,
        formatter: this.formatter,
        humanReadableUnhandledException: this.humanReadableUnhandledException
    });

    process.stdout.write(output + '\n');

    //
    // Emit the `logged` event immediately because the event loop
    // will not exit until `process.stdout` has drained anyway.
    //
    self.emit('logged');
    callback(null, true);
};
