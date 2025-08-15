// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    code: { type: String, required: true },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
