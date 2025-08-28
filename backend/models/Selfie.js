const mongoose = require("mongoose");

const SelfieSchema = new mongoose.Schema(
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

module.exports = mongoose.model("Selfie", SelfieSchema);
