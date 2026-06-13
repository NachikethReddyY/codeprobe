import React from "react";

interface PatchDiffViewerProps {
  diff: string;
}

export function PatchDiffViewer({ diff }: PatchDiffViewerProps) {
  const copyToPaste = () => {
    navigator.clipboard.writeText(diff);
  };

  const downloadPatch = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(diff));
    element.setAttribute("download", "patch.diff");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={copyToPaste}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition"
        >
          Copy to Clipboard
        </button>
        <button
          onClick={downloadPatch}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold transition"
        >
          Download .patch
        </button>
      </div>
      <pre className="bg-gray-900 border border-gray-700 rounded p-4 overflow-auto max-h-96 text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
        {diff}
      </pre>
    </div>
  );
}
