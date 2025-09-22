const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AdminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 128,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 128,
    },
    userName: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      unique: true,
      lowercase: true,
      minlength: [4, "Username must be at least 4 characters"],
      maxlength: [128, "Username can't exceed 128 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    code: {
      type: String,
      required: [true, "Admin code is required"],
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Single pre-save hook to hash both password and code
AdminSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") && !/^\$2[aby]\$/.test(this.password)) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    if (this.isModified("code") && !/^\$2[aby]\$/.test(this.code)) {
      this.code = await bcrypt.hash(this.code, 10);
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Admin", AdminSchema);
