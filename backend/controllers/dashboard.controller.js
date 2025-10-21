const Worker = require("../models/Worker");
const Client = require("../models/Client");
const JobApplication = require("../models/JobApplication");
const { decryptAES128 } = require("../utils/encipher");

exports.getDashboardData = async (req, res) => {
  try {
    const { userType } = req.query; // "worker", "client", "all" or undefined

    // ===== BASIC COUNTS =====
    const workerCount = await Worker.countDocuments();
    const clientCount = await Client.countDocuments();

    // ===== LOCATION AGGREGATION =====
    const cityCountsMap = new Map();

    const addCities = (docs) => {
      for (const doc of docs) {
        let city;
        try {
          city = doc.address?.city
            ? decryptAES128(doc.address.city)
            : "Unknown";
        } catch {
          city = "Unknown";
        }
        cityCountsMap.set(city, (cityCountsMap.get(city) || 0) + 1);
      }
    };

    // Get location data for workers and/or clients
    if (!userType || userType === "worker" || userType === "all") {
      const workers = await Worker.find({}).select("address.city").lean();
      addCities(workers);
    }

    if (!userType || userType === "client" || userType === "all") {
      const clients = await Client.find({}).select("address.city").lean();
      addCities(clients);
    }

    const decryptedLocations = Array.from(cityCountsMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    // Top 3 cities + "Others"
    const topLocations = decryptedLocations.slice(0, 3);
    const otherCount = decryptedLocations
      .slice(3)
      .reduce((sum, loc) => sum + loc.count, 0);
    const locationLabels = [...topLocations.map((loc) => loc.label), "Others"];
    const locationCounts = [
      ...topLocations.map((loc) => loc.count),
      otherCount,
    ];

    // ===== RECENT USERS =====
    let recentUsers = [];

    if (!userType || userType === "all") {
      const [workers, clients] = await Promise.all([
        Worker.find({})
          .select(
            "firstName middleName lastName suffixName profilePicture status createdAt"
          )
          .lean(),
        Client.find({})
          .select(
            "firstName middleName lastName suffixName profilePicture status createdAt"
          )
          .lean(),
      ]);

      recentUsers = [...workers, ...clients]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4);
    } else if (userType === "worker") {
      recentUsers = await Worker.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .select(
          "firstName middleName lastName suffixName profilePicture status"
        )
        .lean();
    } else if (userType === "client") {
      recentUsers = await Client.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .select(
          "firstName middleName lastName suffixName profilePicture status"
        )
        .lean();
    }

    // ===== DECRYPT RECENT USERS =====
    recentUsers = recentUsers.map((user) => {
      try {
        const firstName = user.firstName ? decryptAES128(user.firstName) : "";
        const middleName = user.middleName
          ? decryptAES128(user.middleName)
          : "";
        const lastName = user.lastName ? decryptAES128(user.lastName) : "";
        const suffix = user.suffixName ? decryptAES128(user.suffixName) : "";
        const fullName = `${firstName} ${middleName} ${lastName}${
          suffix ? " " + suffix : ""
        }`
          .replace(/\s+/g, " ")
          .trim();

        return {
          _id: user._id,
          name: fullName,
          profilePicture: user.profilePicture?.url || null,
          status: user.status || "Unknown",
        };
      } catch {
        return {
          _id: user._id,
          name: "Unknown",
          profilePicture: user.profilePicture?.url || null,
          status: user.status || "Unknown",
        };
      }
    });

    // ===== RECENT JOB APPLICATIONS =====
    const recentApplications = await JobApplication.find({})
      .sort({ appliedAt: -1 })
      .limit(10)
      .populate({
        path: "jobId",
        select: "title",
      })
      .populate({
        path: "workerId",
        select: "firstName middleName lastName suffixName profilePicture",
      })
      .populate({
        path: "clientId",
        select: "firstName middleName lastName suffixName",
      })
      .lean();

    const decryptedApplications = recentApplications.map((app) => {
      const decryptName = (user) => {
        if (!user) return "Unknown";
        try {
          const first = user.firstName ? decryptAES128(user.firstName) : "";
          const middle = user.middleName ? decryptAES128(user.middleName) : "";
          const last = user.lastName ? decryptAES128(user.lastName) : "";
          const suffix = user.suffixName ? decryptAES128(user.suffixName) : "";
          return `${first} ${middle} ${last}${suffix ? " " + suffix : ""}`
            .replace(/\s+/g, " ")
            .trim();
        } catch {
          return "Unknown";
        }
      };

      return {
        ...app,
        workerName: decryptName(app.workerId),
        workerProfilePicture: app.workerId?.profilePicture?.url || null,
        clientName: decryptName(app.clientId),
        jobTitle: app.jobId?.title || "Unknown",
      };
    });

    // ===== RESPONSE =====
    res.status(200).json({
      success: true,
      data: {
        users: { workerCount, clientCount, recentUsers },
        locations: { labels: locationLabels, series: locationCounts },
        applications: decryptedApplications,
      },
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};
