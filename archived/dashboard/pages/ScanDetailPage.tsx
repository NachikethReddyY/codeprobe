import React from "react";
import { useScan } from "../hooks/useScan.ts";
import { RiskGauge } from "../components/RiskGauge.tsx";
import { CVETable } from "../components/CVETable.tsx";
import { PatchDiffViewer } from "../components/PatchDiffViewer.tsx";
import { BusinessImpactCard } from "../components/BusinessImpactCard.tsx";

interface ScanDetailPageProps {
  scanId: string;
  token: string | null;
  onBack: () => void;
}

export function ScanDetailPage({ scanId, token, onBack }: ScanDetailPageProps) {
  const { scan, loading, error } = useScan(scanId, token);

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
          ← Back
        </button>
        <div className="bg-red-900 border border-red-600 rounded p-4 text-white">
          Failed to load scan. Try refreshing.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
          ← Back
        </button>
        <p className="text-gray-400">Loading scan details...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
          ← Back
        </button>
        <div className="text-center py-8 text-gray-400">
          Scan not found. It may have been deleted.
        </div>
      </div>
    );
  }

  const copyUrl = () => {
    const url = `${window.location.origin}?scan=${scanId}`;
    navigator.clipboard.writeText(url);
    alert("Scan URL copied!");
  };

  const exportJson = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(scan, null, 2)));
    element.setAttribute("download", `${scanId}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
        ← Back to Scans
      </button>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{scan.repo}</h2>
        <p className="text-gray-400 text-sm">
          Scan ID: <code className="bg-gray-800 px-2 py-1 rounded">{scan.id}</code>
        </p>
        <p className="text-gray-400 text-sm">
          Timestamp: {new Date(scan.timestamp * 1000).toLocaleString()}
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <RiskGauge score={scan.riskScore || 0} />
      </div>

      {scan.cves && scan.cves.length > 0 && (
        <BusinessImpactCard riskScore={scan.riskScore} cveCount={scan.cves.length} />
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded p-4">
          <p className="text-gray-400 text-xs font-semibold mb-1">Confirmed Exploitable</p>
          <p className="text-2xl font-bold text-red-400">
            {scan.cves?.filter((c: any) => c.status.includes("Confirmed")).length || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-4">
          <p className="text-gray-400 text-xs font-semibold mb-1">Theoretical Risk</p>
          <p className="text-2xl font-bold text-yellow-400">
            {scan.cves?.filter((c: any) => c.status.includes("Theoretical")).length || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-4">
          <p className="text-gray-400 text-xs font-semibold mb-1">Supply Chain Warnings</p>
          <p className="text-2xl font-bold text-orange-400">{scan.supplyChainWarnings || 0}</p>
        </div>
      </div>

      {scan.cves && scan.cves.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Vulnerabilities</h3>
          <CVETable cves={scan.cves} />
        </div>
      )}

      {scan.cves?.[0]?.patch && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Patch Diff</h3>
          <PatchDiffViewer diff={scan.cves[0].patch} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={copyUrl}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm transition"
        >
          Copy Scan URL
        </button>
        <button
          onClick={exportJson}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-semibold text-sm transition"
        >
          Export as JSON
        </button>
      </div>
    </div>
  );
}
