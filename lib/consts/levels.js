const levels = {
    TRACE: { name: 'trace', color: 'cyan', level: 5 },
    DEBUG: { name: 'debug', color: 'green', level: 4 },
    INFO: { name: 'info', color: 'cyan', level: 3 },
    WARN: { name: 'warning', color: 'yellow', level: 2 },
    ERROR: { name: 'error', color: 'red', level: 1 },
    CRITICAL: { name: 'critical', color: 'red', level: 0 }
};

module.exports = levels;
