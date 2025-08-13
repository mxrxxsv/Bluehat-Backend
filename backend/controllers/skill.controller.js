const SkillCategory = require("../models/SkillCategory");

const readSkill = async (req, res) => {
  try {
    const categories = await SkillCategory.find();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { readSkill };
