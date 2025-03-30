const mongoose = require("mongoose");

const adsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
    },
    adTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
    },
    datePosted: {
      type: Date,
      default: Date.now,
    },
    expirationDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Advertisement", adsSchema);
