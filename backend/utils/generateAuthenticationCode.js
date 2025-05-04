// utils/generateAuthenticationCode.js
const crypto = require("crypto");

function generateAuthenticationCode(length = 6) {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  return code;
}

module.exports = generateAuthenticationCode;
