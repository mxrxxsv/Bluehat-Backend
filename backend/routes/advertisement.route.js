const express = require("express");
const router = express.Router();

const Advertisement = require("../models/Advertisement");
const { getAdvertisements } = require("../controllers/ads.controller");

router.get("/", getAdvertisements);

router.post("/add-ad", async (req, res) => {
  const { title, description, imageUrl, link } = req.body;
  try {
    if (!title || !description) {
      throw new Error("All fields are required");
    }
    const newAd = new Advertisement({
      title,
      description,
      imageUrl,
      link,
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

// router.delete("/delete-ad/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const deletedAd = await Advertisement.findByIdAndDelete(id);

//     if (!deletedAd) {
//       res.status(404).json({
//         success: false,
//         message: "Advertisement not found",
//       });
//     }
//     res
//       .status(200)
//       .json({ success: true, message: "Advertisement deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// router.put("/update-ad/:id", async (req, res) => {
//   const { id } = req.params;
//   const updateData = req.body;

//   try {
//     const updatedAd = await Advertisement.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updatedAd) {
//       res
//         .status(404)
//         .json({ success: false, message: "No advertisement found" });
//     }
//     res.status(200).json({
//       success: true,
//       message: "Advertisement successfully updated",
//       data: updatedAd,
//     });
//   } catch (error) {}
// });
module.exports = router;
