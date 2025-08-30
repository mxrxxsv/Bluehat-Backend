const jwt = require("jsonwebtoken");

const generateAdminToken = (adminId) => {
  return jwt.sign(
    { id: adminId, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" } // Token expires in 24 hours
  );
};

const setAdminTokenCookie = (res, token) => {
  res.cookie("adminToken", token, {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

module.exports = { generateAdminToken, setAdminTokenCookie };
