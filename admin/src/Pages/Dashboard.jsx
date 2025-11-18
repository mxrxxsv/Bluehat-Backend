import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { fetchDashboardData } from "../Api/dashboard";
import { getWorkers } from "../Api/workermanagement";
import { getClients } from "../Api/clientmanagement";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [workerPage, setWorkerPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [workerHasNext, setWorkerHasNext] = useState(false);
  const [clientHasNext, setClientHasNext] = useState(false);

  // ===== RECENT CONTRACTS =====
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // ----- FETCH TOP LOCATIONS -----
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await fetchDashboardData(locationFilter);
        setLocations(res.locations);
        setUsersCounts({
          workerCount: res.users.workerCount,
          clientCount: res.users.clientCount,
        });
        setDonutOptions((prev) => ({
          ...prev,
          labels: res.locations.labels,
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
    const buildName = (u) => {
      const parts = [u.firstName, u.middleName, u.lastName, u.suffixName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return parts || u.name || "Unknown";
    };

    const mapWorker = (w) => ({
      _id: w._id,
      name: buildName(w),
      profilePicture: w.profilePicture?.url || null,
      createdAt: w.createdAt,
      userType: "worker",
    });

    const mapClient = (c) => ({
      _id: c._id,
      name: buildName(c),
      profilePicture: c.profilePicture?.url || null,
      createdAt: c.createdAt,
      userType: "client",
    });

    const fetchInitialUsers = async () => {
      try {
        setLoadingUsers(true);
        // Clear current list so skeletons appear immediately
        setRecentUsers([]);
        // reset pagination
        setWorkerPage(1);
        setClientPage(1);

        if (newUserFilter === "worker") {
          const res = await getWorkers({ page: 1, sortBy: "createdAt", order: "desc" });
          const workers = (res?.data?.workers || res?.data?.data?.workers || []).map(mapWorker);
          const pagination = res?.data?.pagination || res?.data?.data?.pagination;
          setWorkerHasNext(Boolean(pagination?.hasNextPage));
          setClientHasNext(false);
          setRecentUsers(workers);
        } else if (newUserFilter === "client") {
          const res = await getClients({ page: 1, sortBy: "createdAt", order: "desc" });
          const clients = (res?.data?.clients || res?.data?.data?.clients || []).map(mapClient);
          const pagination = res?.data?.pagination || res?.data?.data?.pagination;
          setClientHasNext(Boolean(pagination?.hasNextPage));
          setWorkerHasNext(false);
          setRecentUsers(clients);
        } else {
          // all: fetch both workers and clients page 1
          const [wRes, cRes] = await Promise.all([
            getWorkers({ page: 1, sortBy: "createdAt", order: "desc" }),
            getClients({ page: 1, sortBy: "createdAt", order: "desc" }),
          ]);
          const workers = (wRes?.data?.workers || wRes?.data?.data?.workers || []).map(mapWorker);
          const clients = (cRes?.data?.clients || cRes?.data?.data?.clients || []).map(mapClient);
          const wPg = wRes?.data?.pagination || wRes?.data?.data?.pagination;
          const cPg = cRes?.data?.pagination || cRes?.data?.data?.pagination;
          setWorkerHasNext(Boolean(wPg?.hasNextPage));
          setClientHasNext(Boolean(cPg?.hasNextPage));
          const merged = [...workers, ...clients].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setRecentUsers(merged);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        // fallback to dashboard recent if something fails
        try {
          const res = await fetchDashboardData(newUserFilter);
          setRecentUsers(res.users.recentUsers || []);
        } catch (_) {}
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchInitialUsers();
  }, [newUserFilter]);

  const loadMoreUsers = async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    const mapWorker = (w) => ({
      _id: w._id,
      name: [w.firstName, w.middleName, w.lastName, w.suffixName].filter(Boolean).join(" ").trim() || w.name || "Unknown",
      profilePicture: w.profilePicture?.url || null,
      createdAt: w.createdAt,
      userType: "worker",
    });
    const mapClient = (c) => ({
      _id: c._id,
      name: [c.firstName, c.middleName, c.lastName, c.suffixName].filter(Boolean).join(" ").trim() || c.name || "Unknown",
      profilePicture: c.profilePicture?.url || null,
      createdAt: c.createdAt,
      userType: "client",
    });

    try {
      if (newUserFilter === "worker" && workerHasNext) {
        const nextPage = workerPage + 1;
        const res = await getWorkers({ page: nextPage, sortBy: "createdAt", order: "desc" });
        const workers = (res?.data?.workers || res?.data?.data?.workers || []).map(mapWorker);
        const pagination = res?.data?.pagination || res?.data?.data?.pagination;
        setWorkerHasNext(Boolean(pagination?.hasNextPage));
        setWorkerPage(nextPage);
        setRecentUsers((prev) => [...prev, ...workers]);
      } else if (newUserFilter === "client" && clientHasNext) {
        const nextPage = clientPage + 1;
        const res = await getClients({ page: nextPage, sortBy: "createdAt", order: "desc" });
        const clients = (res?.data?.clients || res?.data?.data?.clients || []).map(mapClient);
        const pagination = res?.data?.pagination || res?.data?.data?.pagination;
        setClientHasNext(Boolean(pagination?.hasNextPage));
        setClientPage(nextPage);
        setRecentUsers((prev) => [...prev, ...clients]);
      } else if (newUserFilter === "all" && (workerHasNext || clientHasNext)) {
        const promises = [];
        let nextW = workerPage;
        let nextC = clientPage;
        if (workerHasNext) {
          nextW = workerPage + 1;
          promises.push(
            getWorkers({ page: nextW, sortBy: "createdAt", order: "desc" })
          );
        }
        if (clientHasNext) {
          nextC = clientPage + 1;
          promises.push(
            getClients({ page: nextC, sortBy: "createdAt", order: "desc" })
          );
        }
        const results = await Promise.all(promises);
        let newEntries = [];
        results.forEach((res) => {
          const workers = res?.data?.workers || res?.data?.data?.workers;
          const clients = res?.data?.clients || res?.data?.data?.clients;
          if (workers) newEntries = newEntries.concat(workers.map(mapWorker));
          if (clients) newEntries = newEntries.concat(clients.map(mapClient));
          const pagination = res?.data?.pagination || res?.data?.data?.pagination;
          if (workers) {
            setWorkerHasNext(Boolean(pagination?.hasNextPage));
            setWorkerPage(nextW);
          }
          if (clients) {
            setClientHasNext(Boolean(pagination?.hasNextPage));
            setClientPage(nextC);
          }
        });
        setRecentUsers((prev) =>
          [...prev, ...newEntries].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      }
    } catch (e) {
      console.error("Load more users failed:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // ----- FETCH RECENT CONTRACTS -----
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoadingContracts(true);
        const res = await fetchDashboardData("all");
        setContracts(res.contracts);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      } finally {
        setLoadingContracts(false);
      }
    };
    fetchContracts();
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
              <h5 className="text-xl font-bold text-gray-900">Users</h5>
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
              <div className="h-72 overflow-y-auto overscroll-contain pr-1">
                <ul role="list" className="divide-y divide-gray-200">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="py-3 sm:py-4">
                      <div className="flex items-center space-x-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 min-w-0">
                          <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
                          <div className="h-3 w-20 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="h-72 overflow-y-auto overscroll-contain pr-1">
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
                            <p className="text-xs text-gray-500 mt-0.5">
                              {user.userType === "worker" ? "Worker" : "Client"}
                              {user.createdAt ? ` • ${new Date(user.createdAt).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-3 text-gray-500 text-center">
                      No new users found.
                    </li>
                  )}
                </ul>
              </div>
            )}
            {/* Load more */}
            <div className="mt-3 flex justify-center">
              {newUserFilter === "worker" && workerHasNext && (
                <button
                  onClick={loadMoreUsers}
                  disabled={loadingMore}
                  className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60 flex items-center space-x-2"
                >
                  {loadingMore && (
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{loadingMore ? "Loading" : "Load more"}</span>
                </button>
              )}
              {newUserFilter === "client" && clientHasNext && (
                <button
                  onClick={loadMoreUsers}
                  disabled={loadingMore}
                  className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60 flex items-center space-x-2"
                >
                  {loadingMore && (
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{loadingMore ? "Loading" : "Load more"}</span>
                </button>
              )}
              {newUserFilter === "all" && (workerHasNext || clientHasNext) && (
                <button
                  onClick={loadMoreUsers}
                  disabled={loadingMore}
                  className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60 flex items-center space-x-2"
                >
                  {loadingMore && (
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{loadingMore ? "Loading" : "Load more"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Contracts Table */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-6">
          {loadingContracts ? (
            <div className="p-4 text-center text-gray-500">
              Loading contracts...
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Job Description</th>
                  <th className="px-6 py-3">Worker</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Completed At</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No contracts found.
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr
                      key={contract._id}
                      className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {contract.description || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {contract.workerName || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {contract.clientName || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        ₱
                        {contract.agreedRate
                          ? Number(contract.agreedRate).toLocaleString()
                          : "0"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            contract.contractStatus === "completed" ||
                            contract.contractStatus === "active"
                              ? "bg-green-100 text-green-800"
                              : contract.contractStatus === "cancelled" ||
                                contract.contractStatus === "disputed"
                              ? "bg-red-100 text-red-800"
                              : contract.contractStatus === "in_progress" ||
                                contract.contractStatus ===
                                  "awaiting_client_confirmation"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100"
                          }`}
                        >
                          {contract.contractStatus || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {contract.completedAt
                          ? new Date(contract.completedAt).toLocaleDateString()
                          : "N/A"}
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
