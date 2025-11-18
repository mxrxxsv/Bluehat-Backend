const Worker = require("../models/Worker");
const Client = require("../models/Client");
const WorkContract = require("../models/WorkContract");
const Job = require("../models/Job");

// GET /reports/summary?month=YYYY-MM OR ?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns aggregated summary for users, contracts, and jobs in the given period
exports.getMonthlySummary = async (req, res) => {
  try {
    const { month, start, end } = req.query;

    let startDate;
    let endDate;
    let label;

    if (start && end) {
      // Parse start/end as YYYY-MM-DD (UTC at 00:00); end is inclusive
      const startParts = /^\d{4}-\d{2}-\d{2}$/.test(start)
        ? start.split("-").map(Number)
        : null;
      const endParts = /^\d{4}-\d{2}-\d{2}$/.test(end)
        ? end.split("-").map(Number)
        : null;

      if (!startParts || !endParts) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range. Expected start/end as YYYY-MM-DD",
        });
      }
      startDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0));
      // endDate exclusive -> add 1 day at 00:00 UTC
      const endInclusive = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 0, 0, 0));
      endDate = new Date(endInclusive.getTime() + 24 * 60 * 60 * 1000);

      if (!(startDate < endDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid range: start must be before or equal to end",
        });
      }
      label = `${start} to ${end}`;
    } else if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
          success: false,
          message: "Invalid month. Expected format YYYY-MM",
        });
      }
      const [year, monthNum] = month.split("-").map(Number);
      startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0)); // first day next month
      label = month;
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide either month=YYYY-MM or start/end=YYYY-MM-DD",
      });
    }

    // USERS
    const newWorkers = await Worker.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } });
    const newClients = await Client.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } });
    // Totals within the selected range (not all-time)
    const totalWorkers = await Worker.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } });
    const totalClients = await Client.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } });

    // JOBS
    const jobsInMonth = await Job.find({ createdAt: { $gte: startDate, $lt: endDate } }).select("status price").lean();
    const jobStatusCounts = jobsInMonth.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {});
    const totalJobValue = jobsInMonth.reduce((sum, j) => sum + (j.price || 0), 0);

    // CONTRACTS
    const contractsInMonth = await WorkContract.find({ createdAt: { $gte: startDate, $lt: endDate } }).select("contractStatus agreedRate completedAt").lean();
    const contractStatusCounts = contractsInMonth.reduce((acc, c) => {
      acc[c.contractStatus] = (acc[c.contractStatus] || 0) + 1;
      return acc;
    }, {});
    const totalContractValue = contractsInMonth.reduce((sum, c) => sum + (c.agreedRate || 0), 0);
    const completedContractsValue = contractsInMonth.reduce((sum, c) => {
      if (c.contractStatus === "completed") return sum + (c.agreedRate || 0);
      return sum;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        month: label,
        range: { startDate, endDate },
        users: {
          newWorkers,
          newClients,
          totalWorkers,
          totalClients,
          newTotal: newWorkers + newClients,
        },
        jobs: {
          total: jobsInMonth.length,
          statusCounts: jobStatusCounts,
          totalValue: totalJobValue,
          averageValue: jobsInMonth.length ? totalJobValue / jobsInMonth.length : 0,
        },
        contracts: {
          total: contractsInMonth.length,
          statusCounts: contractStatusCounts,
          totalValue: totalContractValue,
          completedValue: completedContractsValue,
          completionRate: contractsInMonth.length ? (contractStatusCounts.completed || 0) / contractsInMonth.length : 0,
        },
      },
    });
  } catch (error) {
    console.error("Monthly summary error", error);
    res.status(500).json({ success: false, message: "Failed to build monthly summary" });
  }
};
