const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const code = req.cookies.code;

  if (!code) {
    return res.status(401).json({ success: false, message: "No token found" });
  }

  try {
    const decoded = jwt.verify(code, process.env.JWT_SECRET);
    req.code = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

module.exports = verifyToken;
