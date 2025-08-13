const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AdminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    userName: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      unique: true,
      lowercase: true,
      minlength: [4, "Username must be at least 4 characters"],
      maxlength: [30, "Username can't exceed 30 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    code: {
      type: String,
      required: [true, "4-digit code is required"],
      validate: {
        validator: function (v) {
          return /^\d{4}$/.test(v);
        },
        message: "Code must be exactly 4 digits",
      },
      select: false,
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
