const crypto = require("crypto");
require("dotenv").config();

const AES_KEY = process.env.AES_KEY;

// AES-128 Encryption Function
const encryptAES128 = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(AES_KEY), iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// AES-128 Decryption Function
const decryptAES128 = (encryptedData) => {
  const encryptedDataParts = encryptedData.split(":");
  const iv = Buffer.from(encryptedDataParts.shift(), "hex");
  const encrypted = Buffer.from(encryptedDataParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    Buffer.from(AES_KEY),
    iv
  );
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

module.exports = { encryptAES128, decryptAES128 };
