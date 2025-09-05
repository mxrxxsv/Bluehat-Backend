import React, { useState } from "react";
import Chart from "react-apexcharts";

const Dashboard = () => {
  // Donut chart options
  const donutOptions = {
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
              formatter: (w) => {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return sum + "k";
              },
            },
          },
        },
      },
    },
  };

  const [donutSeries, setDonutSeries] = useState([35.1, 23.5, 2.4, 5.4]);

  const handleDeviceChange = (device) => {
    switch (device) {
      case "desktop":
        setDonutSeries([15.1, 22.5, 4.4, 8.4]);
        break;
      case "tablet":
        setDonutSeries([25.1, 26.5, 1.4, 3.4]);
        break;
      case "mobile":
        setDonutSeries([45.1, 27.5, 8.4, 2.4]);
        break;
      default:
        setDonutSeries([35.1, 23.5, 2.4, 5.4]);
    }
  };

  // Active users
  const users = [
    {
      id: 1,
      name: "Ezekiel",
      email: "eze@gmail.com",
      avatar:
        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
      status: "Available",
    },
    {
      id: 2,
      name: "Richmond",
      email: "richmond@gmail.com",
      avatar:
        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
      status: "Working",
    },
  ];

  // ✅ Example Job Applications (schema-aligned)
  const [applications] = useState([
    {
      _id: "1",
      jobId: { title: "Plumbing" },
      workerId: { name: "John Doe" },
      clientId: { name: "Alice Johnson" },
      coverLetter: "I have 5 years of experience in plumbing and pipe fitting.",
      proposedPrice: 25000,
      estimatedDuration: { value: 30, unit: "days" },
      status: "pending",
      appliedAt: "2025-09-01T10:00:00.000Z",
      viewedByClient: false,
    },
    {
      _id: "2",
      jobId: { title: "Electrician" },
      workerId: { name: "Maria Garcia" },
      clientId: { name: "Michael Smith" },
      coverLetter:
        "Experienced electrician with a strong background in residential and commercial wiring.",
      proposedPrice: 18000,
      estimatedDuration: { value: 14, unit: "days" },
      status: "accepted",
      appliedAt: "2025-08-29T15:30:00.000Z",
      viewedByClient: true,
    },
    {
      _id: "3",
      jobId: { title: "Plumbing" },
      workerId: { name: "Chris Lee" },
      clientId: { name: "Sophia Williams" },
      coverLetter:
        "I can provide fast and accurate plumbing services for your project.",
      proposedPrice: 5000,
      estimatedDuration: { value: 1, unit: "weeks" },
      status: "rejected",
      appliedAt: "2025-08-25T09:45:00.000Z",
      viewedByClient: true,
    },
  ]);

  return (
    <div className="p-4 sm:ml-64">
      <div className="p-6 border-2 border-gray-200 border-dashed rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* User Chart Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h5 className="text-xl font-bold text-gray-900 mb-4">
              User Distribution
            </h5>
            <Chart
              options={{
                chart: { type: "pie" },
                labels: ["Worker", "Client"],
                colors: ["#1C64F2", "#16BDCA"],
                legend: { position: "bottom" },
              }}
              series={[44, 33]}
              type="pie"
              height={250}
            />
          </div>

          {/* Donut Chart Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h5 className="text-xl font-bold text-gray-900 mb-4">Location</h5>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  value="desktop"
                  className="w-4 h-4 mr-2"
                  onChange={() => handleDeviceChange("desktop")}
                />
                Mabini
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  value="tablet"
                  className="w-4 h-4 mr-2"
                  onChange={() => handleDeviceChange("tablet")}
                />
                Magsaysay
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  value="mobile"
                  className="w-4 h-4 mr-2"
                  onChange={() => handleDeviceChange("mobile")}
                />
                Pob.
              </label>
            </div>
            <Chart
              options={donutOptions}
              series={donutSeries}
              type="donut"
              height={250}
            />
          </div>

          {/* User List Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h5 className="text-xl font-bold text-gray-900 mb-4">
              Active Users
            </h5>
            <ul role="list" className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="py-3 sm:py-4">
                  <div className="flex items-center space-x-3">
                    <img
                      className="w-10 h-10 rounded-full"
                      src={user.avatar}
                      alt={user.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full
                        ${
                          user.status === "Available"
                            ? "bg-green-100 text-green-800"
                            : user.status === "Working"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      <span
                        className={`w-2 h-2 mr-1 rounded-full
                          ${
                            user.status === "Available"
                              ? "bg-green-500"
                              : user.status === "Working"
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }`}
                      ></span>
                      {user.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Job Applications Table */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-6">
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
              {applications.map((app) => (
                <tr
                  key={app._id}
                  className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {app.jobId.title}
                  </td>
                  <td className="px-6 py-4">{app.workerId.name}</td>
                  <td className="px-6 py-4">{app.clientId.name}</td>
                  <td className="px-6 py-4">
                    ₱{app.proposedPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {app.estimatedDuration.value} {app.estimatedDuration.unit}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-full
                        ${
                          app.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : app.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {app.viewedByClient ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
