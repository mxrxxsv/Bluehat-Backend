import { useEffect, useState } from "react";
import { getPendingJobs, approveJob, rejectJob } from "../Api/jobApi";

const JobPending = () => {

    const [jobs, setJobs] = useState([]);
    const [jobLoading, setJobLoading] = useState(true);
    const [jobError, setJobError] = useState("");

    // ✅ Fetch pending jobs
  const fetchJobs = async () => {
    try {
      setJobLoading(true);
      const res = await getPendingJobs();
      if (res.data.success) {
        setJobs(res.data.data.jobs);
      }
    } catch (err) {
      console.error(err);
      setJobError("Error fetching jobs");
    } finally {
      setJobLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // ✅ Job Approve/Reject
  const handleApprove = async (id) => {
    try {
      await approveJob(id);
      fetchJobs();
    } catch (err) {
      alert("Failed to approve job");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectJob(id);
      fetchJobs();
    } catch (err) {
      alert("Failed to reject job");
    }
  };

    return (
        <>
            <div className="p-4 sm:ml-64">
                {/* === Job Posts Section === */}
                <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl shadow-md">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">Pending Job Posts</h1>

                    {jobLoading ? (
                        <p className="text-gray-500">Loading jobs...</p>
                    ) : jobError ? (
                        <p className="text-red-500">{jobError}</p>
                    ) : jobs.length === 0 ? (
                        <p className="text-gray-600">No pending jobs found.</p>
                    ) : (
                        <ul className="space-y-3">
                            {jobs.map((job) => (
                                <li
                                    key={job._id}
                                    className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition duration-200"
                                >
                                    <h2 className="text-xl font-semibold text-gray-800">{job.title}</h2>
                                    <p className="text-gray-600">{job.description}</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Posted by: {job.postedBy?.username || "Unknown"}
                                    </p>
                                    <div className="flex gap-3 mt-3">
                                        <button
                                            onClick={() => handleApprove(job._id)}
                                            className="px-4 py-2 bg-[#55b3f3] text-white rounded-xl hover:bg-sky-700 cursor-pointer"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(job._id)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    )
};

export default JobPending;  