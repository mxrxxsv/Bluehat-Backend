const mongoose = require("mongoose");

const IDPictureSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: false,
    },
    public_id: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IDPicture", IDPictureSchema);
