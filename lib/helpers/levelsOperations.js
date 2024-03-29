const levels = require('../consts/levels');

const getLevelNumberByName = level => Object.values(levels).find(l => l.name === level).level;
const biggerLevelOperator = (levelA, levelB) => (getLevelNumberByName(levelA) >= getLevelNumberByName(levelB));

module.exports = { getLevelNumberByName, biggerLevelOperator };
