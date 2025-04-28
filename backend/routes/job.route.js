const express = require("express");
const router = express.Router();

const {
  getJobs,
  postJob,
  deleteJob,
} = require("../controllers/job.controller");

router.get("/", getJobs);

router.post("post-job", postJob);

module.exports = router;
