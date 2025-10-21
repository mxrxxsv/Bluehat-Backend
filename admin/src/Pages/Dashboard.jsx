import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { fetchDashboardData } from "../Api/dashboard";

const Dashboard = () => {
  // ===== GLOBAL COUNTS =====
  const [usersCounts, setUsersCounts] = useState({
    workerCount: 0,
    clientCount: 0,
  });

  // ===== TOP LOCATIONS =====
  const [locations, setLocations] = useState({
    labels: ["Mabini", "Magsaysay", "Pob.", "Others"],
    series: [0, 0, 0, 0],
  });
  const [donutOptions, setDonutOptions] = useState({
    chart: { type: "donut" },
    labels: ["Mabini", "Magsaysay", "Pob.", "Others"],
    colors: ["#1C64F2", "#16BDCA", "#FDBA8C", "#E74694"],
    legend: { position: "bottom" },
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Users Locations",
              formatter: (w) =>
                w.globals.seriesTotals
                  .reduce((a, b) => a + b, 0)
                  .toLocaleString(),
            },
          },
        },
      },
    },
  });
  const [locationFilter, setLocationFilter] = useState("worker");
  const [loadingLocations, setLoadingLocations] = useState(false);

  // ===== NEW USERS =====
  const [recentUsers, setRecentUsers] = useState([]);
  const [newUserFilter, setNewUserFilter] = useState("worker");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ===== JOB APPLICATIONS =====
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  // ----- FETCH TOP LOCATIONS -----
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await fetchDashboardData(locationFilter);
        setLocations(res.data.locations);
        setUsersCounts({
          workerCount: res.data.users.workerCount,
          clientCount: res.data.users.clientCount,
        });
        setDonutOptions((prev) => ({
          ...prev,
          labels: res.data.locations.labels,
        }));
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, [locationFilter]);

  // ----- FETCH NEW USERS -----
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await fetchDashboardData(newUserFilter);
        setRecentUsers(res.data.users.recentUsers.slice(0, 3)); // limit to 3
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [newUserFilter]);

  // ----- FETCH RECENT JOB APPLICATIONS -----
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoadingApplications(true);
        const res = await fetchDashboardData("all"); // fetch all for applications
        setApplications(res.data.applications);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoadingApplications(false);
      }
    };
    fetchApplications();
  }, []);

  return (
    <div className="p-4 sm:ml-64">
      <div className="p-6 border-2 border-gray-200 border-dashed rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* User Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h5 className="text-xl font-bold text-gray-900 mb-4">
              User Distribution
            </h5>
            <Chart
              options={{
                chart: { type: "pie" },
                labels: ["Workers", "Clients"],
                colors: ["#1C64F2", "#16BDCA"],
                legend: { position: "bottom" },
              }}
              series={[usersCounts.workerCount, usersCounts.clientCount]}
              type="pie"
              height={250}
            />
          </div>

          {/* Top Locations Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-xl font-bold text-gray-900">Top Locations</h5>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="worker">Worker</option>
                <option value="client">Client</option>
              </select>
            </div>
            {loadingLocations ? (
              <div className="text-center text-gray-500">
                Loading locations...
              </div>
            ) : (
              <Chart
                options={donutOptions}
                series={locations.series}
                type="donut"
                height={250}
              />
            )}
          </div>

          {/* Recent Users List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-xl font-bold text-gray-900">New Users</h5>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={newUserFilter}
                onChange={(e) => setNewUserFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="worker">Worker</option>
                <option value="client">Client</option>
              </select>
            </div>
            {loadingUsers ? (
              <div className="text-center text-gray-500">Loading users...</div>
            ) : (
              <ul role="list" className="divide-y divide-gray-200">
                {recentUsers.length > 0 ? (
                  recentUsers.map((user, i) => (
                    <li key={i} className="py-3 sm:py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          className="w-10 h-10 rounded-full"
                          src={
                            user.profilePicture ||
                            "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                          }
                          alt={user.name}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                          </p>
                        </div>
                        {/* {user.status && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            user.status === "Available" ? "bg-green-100 text-green-800" :
                            user.status === "Working" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            <span className={`w-2 h-2 mr-1 rounded-full ${
                              user.status === "Available" ? "bg-green-500" :
                              user.status === "Working" ? "bg-red-500" : "bg-gray-500"
                            }`}></span>
                            {user.status || "Unknown"}
                          </span>
                        )} */}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-3 text-gray-500 text-center">
                    No new users found.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Job Applications Table */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-6">
          {loadingApplications ? (
            <div className="p-4 text-center text-gray-500">
              Loading applications...
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Job</th>
                  <th className="px-6 py-3">Worker</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Applied At</th>
                  <th className="px-6 py-3">Viewed</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr
                      key={app._id}
                      className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {app.jobTitle || "N/A"}
                      </td>
                      <td className="px-6 py-4">{app.workerName || "N/A"}</td>
                      <td className="px-6 py-4">{app.clientName || "N/A"}</td>
                      <td className="px-6 py-4">
                        ₱{app.proposedPrice?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4">
                        {app.estimatedDuration?.value || "-"}{" "}
                        {app.estimatedDuration?.unit || ""}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            app.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : app.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {app.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {app.appliedAt
                          ? new Date(app.appliedAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {app.viewedByClient ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
