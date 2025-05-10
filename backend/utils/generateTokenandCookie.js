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
    httpOnly: true, //XSS attack
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", //csrf
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return token;
};

module.exports = generateTokenandSetCookie;
