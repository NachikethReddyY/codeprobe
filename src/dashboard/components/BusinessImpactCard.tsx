import React from "react";

interface BusinessImpactCardProps {
  riskScore: number;
  cveCount: number;
}

export function BusinessImpactCard({ riskScore, cveCount }: BusinessImpactCardProps) {
  const breachCostM = 4.9;
  const estimatedRisk = (riskScore / 10) * breachCostM;

  return (
    <div className="bg-red-900 border-4 border-red-600 rounded-lg p-8 mb-8">
      <div className="flex items-start gap-4 mb-6">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-3xl font-bold text-white">BUSINESS IMPACT</h2>
      </div>

      <p className="text-white text-lg mb-4">
        This codebase contains <strong>{cveCount}</strong> confirmed vulnerabilities.
      </p>

      <div className="bg-red-800 rounded p-4 mb-6">
        <p className="text-white font-semibold mb-2">If exploited → attacker can:</p>
        <ul className="text-white space-y-2">
          <li>• Execute arbitrary code on your server</li>
          <li>• Steal sensitive customer data</li>
          <li>• Hold your service ransom</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-800 rounded p-4">
          <p className="text-gray-200 text-sm">Average breach cost</p>
          <p className="text-2xl font-bold text-white">${breachCostM.toFixed(1)}M</p>
        </div>
        <div className="bg-red-800 rounded p-4">
          <p className="text-gray-200 text-sm">Your estimated risk</p>
          <p className="text-2xl font-bold text-white">${estimatedRisk.toFixed(1)}M</p>
        </div>
      </div>

      <p className="text-white font-semibold bg-red-800 rounded p-3">
        Recommended: Patch within 24 hours
      </p>
    </div>
  );
}
