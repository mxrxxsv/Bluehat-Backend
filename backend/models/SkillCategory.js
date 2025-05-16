const mongoose = require("mongoose");

const SkillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Skill name too short"],
      maxlength: [50, "Skill name too long"],
      lowercase: true,
    },
  },
  { _id: false }
);

const SkillCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Category name too short"],
      maxlength: [50, "Category name too long"],
    },
    skills: {
      type: [SkillSchema],
      validate: [
        {
          validator: function (arr) {
            // No duplicate skill names (case-insensitive)
            const names = arr.map((s) => s.skillName.toLowerCase());
            return names.length === new Set(names).size;
          },
          message: "Duplicate skill names are not allowed.",
        },
        {
          validator: function (arr) {
            return arr.length > 0;
          },
          message: "At least one skill is required.",
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillCategory", SkillCategorySchema);
