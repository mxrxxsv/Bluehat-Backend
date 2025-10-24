const jwt = require("jsonwebtoken");

const generateVerifyToken = (res, email, userType) => {
  const code = jwt.sign(
    { email: email, userType: userType },
    process.env.JWT_SECRET,
    {
      expiresIn: "30m",
    }
  );

  res.cookie("code", code, {
    httpOnly: true, // XSS attack prevention
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Strict for dev, none for prod cross-origin
    maxAge: 1 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return code;
};

module.exports = generateVerifyToken;