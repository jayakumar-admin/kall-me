const crypto = require('crypto');

const generatePassword = (length = 6) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

module.exports = { generatePassword };
