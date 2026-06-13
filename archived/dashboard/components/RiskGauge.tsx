import React from "react";

interface RiskGaugeProps {
  score: number;
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const percentage = (score / 10) * 100;
  let colorClass = "bg-green-500";
  let labelColor = "text-green-400";

  if (score >= 8) {
    colorClass = "bg-red-500";
    labelColor = "text-red-400";
  } else if (score >= 6) {
    colorClass = "bg-orange-500";
    labelColor = "text-orange-400";
  } else if (score >= 4) {
    colorClass = "bg-yellow-500";
    labelColor = "text-yellow-400";
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex-shrink-0">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${(percentage / 100) * 282.7} 282.7`}
              className={`text-blue-500 transition-all duration-500`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-3xl font-bold ${labelColor}`}>{score.toFixed(1)}</div>
              <div className="text-xs text-gray-400">/10</div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Risk Level</h3>
        <p className={`text-lg font-bold ${labelColor}`}>
          {score >= 8 ? "CRITICAL" : score >= 6 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW"}
        </p>
      </div>
    </div>
  );
}
