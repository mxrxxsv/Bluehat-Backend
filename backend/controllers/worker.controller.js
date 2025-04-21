const Advertisement = require("../models/Advertisement");

const getAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.find({});
    if (advertisement.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "There are no advertisement" });
    }
    res.status(200).json({ success: true, data: advertisement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAdvertisement };
