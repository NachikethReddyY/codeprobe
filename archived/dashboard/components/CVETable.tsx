import React, { useState } from "react";

interface CVE {
  id: string;
  package: string;
  severity: string;
  status: string;
  patch?: string;
  description?: string;
  affectedVersions?: string;
  poc?: string;
}

interface CVETableProps {
  cves: CVE[];
  onExpandCVE?: (cve: CVE) => void;
}

export function CVETable({ cves, onExpandCVE }: CVETableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    if (severity === "CRITICAL" || severity === "HIGH") return "text-red-400";
    if (severity === "MEDIUM") return "text-yellow-400";
    return "text-green-400";
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("Confirmed")) return "✅";
    if (status.includes("Theoretical")) return "⚠️";
    return "❓";
  };

  if (!cves || cves.length === 0) {
    return <div className="text-gray-400 text-center py-8">No CVEs found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-300">CVE ID</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Package</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Severity</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Patch</th>
          </tr>
        </thead>
        <tbody>
          {cves.map((cve) => (
            <React.Fragment key={cve.id}>
              <tr
                className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition"
                onClick={() => {
                  setExpanded(expanded === cve.id ? null : cve.id);
                  onExpandCVE?.(cve);
                }}
              >
                <td className="py-4 px-4 font-mono text-blue-400">{cve.id}</td>
                <td className="py-4 px-4 text-gray-300">{cve.package}</td>
                <td className={`py-4 px-4 font-semibold ${getSeverityColor(cve.severity)}`}>
                  {cve.severity}
                </td>
                <td className="py-4 px-4 text-gray-300">
                  {getStatusIcon(cve.status)} {cve.status}
                </td>
                <td className="py-4 px-4 text-gray-400">{cve.patch || "N/A"}</td>
              </tr>
              {expanded === cve.id && (
                <tr className="bg-gray-800 border-b border-gray-700">
                  <td colSpan={5} className="py-4 px-4">
                    <div className="space-y-3">
                      {cve.description && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">Description</p>
                          <p className="text-gray-300">{cve.description}</p>
                        </div>
                      )}
                      {cve.affectedVersions && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">Affected Versions</p>
                          <p className="text-gray-300 font-mono text-sm">{cve.affectedVersions}</p>
                        </div>
                      )}
                      {cve.poc && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">Exploit Evidence</p>
                          <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 overflow-auto max-h-32">
                            {cve.poc}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
