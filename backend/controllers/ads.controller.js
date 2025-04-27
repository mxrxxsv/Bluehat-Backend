const Advertisement = require("../models/Advertisement");

const getAdvertisements = async (req, res) => {
  try {
    const advertisements = await Advertisement.find({});

    if (advertisements.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "There are on advertisements" });
    }
    res.status(200).json({ success: true, data: advertisements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAdvertisements };
