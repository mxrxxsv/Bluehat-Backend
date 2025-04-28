const mongoose = require("mongoose");

const SkillCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    skills: [
      {
        skillName: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillCategory", SkillCategorySchema);
