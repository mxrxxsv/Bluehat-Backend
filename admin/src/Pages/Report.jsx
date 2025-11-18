import React, { useState } from "react";
import { getReportByRange } from "../Api/report";
import { FileDown, Calendar, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const Report = () => {
  const today = new Date();
  const [ranges, setRanges] = useState([
    {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      key: "selection",
    },
  ]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      setData(null);
      const sel = ranges[0];
      const start = format(sel.startDate, "yyyy-MM-dd");
      const end = format(sel.endDate || sel.startDate, "yyyy-MM-dd");
      const res = await getReportByRange({ start, end });
      if (!res.success) throw new Error(res.message || "Failed to fetch report");
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!data) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const title = `Summary Report - ${data.month}`;
      doc.setFontSize(18);
      doc.text(title, 40, 40);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);

      // Users table
      autoTable(doc, {
        startY: 80,
        head: [["Users", "Count"]],
        body: [
          ["New Workers", data.users.newWorkers],
          ["New Clients", data.users.newClients],
          ["Total New Users", data.users.newTotal],
          ["Total Workers (In Range)", data.users.totalWorkers],
          ["Total Clients (In Range)", data.users.totalClients],
        ],
      });

      // Jobs table
      const jobStartY = doc.lastAutoTable.finalY + 20;
      const jobStatusRows = Object.entries(data.jobs.statusCounts).map(([k, v]) => [k, v]);
      autoTable(doc, {
        startY: jobStartY,
        head: [["Jobs", "Value"]],
        body: [
          ["Total Jobs", data.jobs.total],
          ["Total Job Value", data.jobs.totalValue.toLocaleString()],
          ["Avg Job Value", data.jobs.averageValue.toFixed(2)],
          ...jobStatusRows,
        ],
      });

      // Contracts table
      const contractStartY = doc.lastAutoTable.finalY + 20;
      const contractStatusRows = Object.entries(data.contracts.statusCounts).map(([k, v]) => [k, v]);
      autoTable(doc, {
        startY: contractStartY,
        head: [["Contracts", "Value"]],
        body: [
          ["Total Contracts", data.contracts.total],
          ["Total Contract Value", data.contracts.totalValue.toLocaleString()],
          ["Completed Value", data.contracts.completedValue.toLocaleString()],
          ["Completion Rate", (data.contracts.completionRate * 100).toFixed(1) + "%"],
          ...contractStatusRows,
        ],
      });

      doc.save(`fixit-report-${data.month}.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCalendarEvent = () => {
    // Create an ICS file for a recurring monthly reminder to generate report
    const base = ranges[0]?.startDate || new Date();
    const reminderStart = new Date(base.getFullYear(), base.getMonth(), 1, 9, 0, 0); // 9 AM first day
    const dtStart = formatICSDate(reminderStart);
    const uid = `fixit-report-${data?.month || format(base, "yyyy-MM")}-${Date.now()}@fixit`;
    const until = new Date(reminderStart.getFullYear() + 1, reminderStart.getMonth(), 1); // one year span
    const dtUntil = formatICSDate(until);
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FixIt//Reports//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${formatICSDate(new Date())}\nDTSTART:${dtStart}\nRRULE:FREQ=MONTHLY;UNTIL=${dtUntil}\nSUMMARY:Generate FixIt Report\nDESCRIPTION:Reminder to generate and archive FixIt report.\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fixit-report-reminder-${data?.month || format(base, "yyyy-MM")}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const formatICSDate = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  return (
    <div className="p-4 sm:ml-64">
      <div className="p-6 border-2 border-gray-200 border-dashed rounded-lg">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Reports</h1>

        <div className="flex flex-col gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 inline-block self-center mx-auto">
            <DateRange
              ranges={ranges}
              onChange={(item) => setRanges([item.selection])}
              moveRangeOnFirstSelection={false}
              showSelectionPreview
              months={2}
              direction="horizontal"
              rangeColors={["#55b3f3"]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end w-full">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 bg-[#55b3f3] text-white rounded-lg flex items-center gap-2 hover:bg-sky-600 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Fetch Summary</span>
            </button>
            <button
              onClick={downloadCalendarEvent}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#55b3f3]" />
              <span>Add Monthly Reminder</span>
            </button>
            <button
              onClick={generatePDF}
              disabled={!data || generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-60 cursor-pointer"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {error && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        {!data && !loading && (
          <p className="text-gray-500 text-sm">Select a date range on the calendar, then click Fetch Summary.</p>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Users */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Users</h2>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>New Workers: <strong>{data.users.newWorkers}</strong></li>
                <li>New Clients: <strong>{data.users.newClients}</strong></li>
                <li>Total New: <strong>{data.users.newTotal}</strong></li>
                <li>Total Workers (In Range): <strong>{data.users.totalWorkers}</strong></li>
                <li>Total Clients (In Range): <strong>{data.users.totalClients}</strong></li>
              </ul>
            </div>
            {/* Jobs */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Jobs</h2>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>Total Jobs: <strong>{data.jobs.total}</strong></li>
                <li>Total Value: <strong>₱{data.jobs.totalValue.toLocaleString()}</strong></li>
                <li>Avg Value: <strong>₱{data.jobs.averageValue.toFixed(2)}</strong></li>
                {Object.entries(data.jobs.statusCounts).map(([k,v]) => (
                  <li key={k}>{k}: <strong>{v}</strong></li>
                ))}
              </ul>
            </div>
            {/* Contracts */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Contracts</h2>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>Total Contracts: <strong>{data.contracts.total}</strong></li>
                <li>Total Value: <strong>₱{data.contracts.totalValue.toLocaleString()}</strong></li>
                <li>Completed Value: <strong>₱{data.contracts.completedValue.toLocaleString()}</strong></li>
                <li>Completion Rate: <strong>{(data.contracts.completionRate * 100).toFixed(1)}%</strong></li>
                {Object.entries(data.contracts.statusCounts).map(([k,v]) => (
                  <li key={k}>{k}: <strong>{v}</strong></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
