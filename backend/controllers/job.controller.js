const Job = require("../models/Job");

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({});

    if (jobs.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "There are no posts available" });
    }

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const postJob = async (req, res) => {};
const deleteJob = async (req, res) => {};

module.exports = { getJobs, postJob, deleteJob };
