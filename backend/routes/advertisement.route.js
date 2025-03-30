const express = require("express");
const router = express.Router();

const Advertisement = require("../models/Advertisement");

router.get("/", async (req, res) => {
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
});

router.post("/add-ad", async (req, res) => {
  const { companyName, adTitle, description, category } = req.body;
  try {
    const newAd = new Advertisement({
      companyName,
      adTitle,
      description,
      category,
    });

    await newAd.save();

    res.status(201).json({
      success: true,
      message: "New Advertisement Created",
      advertisement: { ...newAd._doc },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/delete-ad/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedAd = await Advertisement.findByIdAndDelete(id);

    if (!deletedAd) {
      res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Advertisement deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/update-ad/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedAd = await Advertisement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAd) {
      res
        .status(404)
        .json({ success: false, message: "No advertisement found" });
    }
    res.status(200).json({
      success: true,
      message: "Advertisement successfully updated",
      data: updatedAd,
    });
  } catch (error) {}
});
module.exports = router;
