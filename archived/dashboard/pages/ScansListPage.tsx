import React, { useState } from "react";
import { useScans } from "../hooks/useScan.ts";

interface ScansListPageProps {
  token: string | null;
  onSelectScan: (scanId: string) => void;
}

export function ScansListPage({ token, onSelectScan }: ScansListPageProps) {
  const { scans, loading, error } = useScans(token);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | null>(null);

  const itemsPerPage = 10;
  const filtered = filter
    ? scans.filter((s) => {
        const risk = s.riskScore || 0;
        if (filter === "CRITICAL") return risk >= 8;
        if (filter === "HIGH") return risk >= 6 && risk < 8;
        if (filter === "MEDIUM") return risk >= 4 && risk < 6;
        return risk < 4;
      })
    : scans;

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const maxPages = Math.ceil(filtered.length / itemsPerPage);

  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 rounded p-4 text-white">
        Failed to load scans. Try refreshing.
      </div>
    );
  }

  if (filtered.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No scans yet.</p>
        <p className="text-gray-500 text-sm">
          Run <code className="bg-gray-800 px-2 py-1 rounded">codeprobe scan</code> from CLI
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setFilter(null);
            setPage(1);
          }}
          className={`px-4 py-2 rounded text-sm font-semibold transition ${
            filter === null
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          All
        </button>
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
          <button
            key={level}
            onClick={() => {
              setFilter(level);
              setPage(1);
            }}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              filter === level
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400">Loading scans...</p>}

      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Scan ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Repo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Risk</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">CVEs</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((scan: any) => (
                  <tr key={scan.id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td className="py-4 px-4 font-mono text-blue-400 text-xs">{scan.id}</td>
                    <td className="py-4 px-4 text-gray-300 max-w-xs truncate">{scan.repo}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          scan.riskScore >= 8
                            ? "bg-red-900 text-red-300"
                            : scan.riskScore >= 6
                              ? "bg-orange-900 text-orange-300"
                              : scan.riskScore >= 4
                                ? "bg-yellow-900 text-yellow-300"
                                : "bg-green-900 text-green-300"
                        }`}
                      >
                        {scan.riskScore?.toFixed(1) || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{scan.cves?.length || 0}</td>
                    <td className="py-4 px-4 text-gray-400 text-xs">
                      {new Date(scan.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onSelectScan(scan.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {maxPages > 1 && (
            <div className="flex justify-between items-center">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {page} of {maxPages}
              </span>
              <button
                onClick={() => setPage(Math.min(maxPages, page + 1))}
                disabled={page === maxPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
