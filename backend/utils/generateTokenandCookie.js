const jwt = require("jsonwebtoken");

const generateTokenandSetCookie = (res, credential) => {
  const token = jwt.sign(
    { id: credential._id, userType: credential.userType },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("token", token, {
    httpOnly: true, // XSS attack prevention
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Strict for dev, none for prod cross-origin
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  return token;
};

module.exports = generateTokenandSetCookie;