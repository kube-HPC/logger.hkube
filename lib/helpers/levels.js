const LEVELS = require('../consts/levels');

const _createLevels = (levels) => {
    const obj = Object.create(null);
    Object.values(levels).forEach(v => {
        obj[v.name] = v.level;
    });
    return obj;
};

const _createColors = (levels) => {
    const obj = Object.create(null);
    Object.values(levels).forEach(v => {
        obj[v.name] = v.color;
    });
    return obj;
};

const resolveLevel = (level, levels) => {
    let result;
    if (typeof level === 'string' && levels[level] !== undefined) {
        result = level;
    }
    if (typeof level === 'number') {
        const entry = Object.entries(levels).find(([, v]) => v === level);
        result = entry?.[0];
    }
    return result || LEVELS.INFO.name;
};

const levelsMap = _createLevels(LEVELS);
const colorsMap = _createColors(LEVELS);

module.exports = {
    levelsMap,
    colorsMap,
    resolveLevel
};
