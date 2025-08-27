const mongoose = require("mongoose");

const SkillCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Category name too short"],
      maxlength: [50, "Category name too long"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillCategory", SkillCategorySchema);
