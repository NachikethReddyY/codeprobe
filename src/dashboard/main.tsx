import React from "react";
import { createRoot } from "react-dom/client";
import { useAuth } from "./hooks/useAuth.ts";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ScansListPage } from "./pages/ScansListPage.tsx";
import { ScanDetailPage } from "./pages/ScanDetailPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

type Page = "login" | "list" | "detail";

function Dashboard() {
  const { token, loading, login, logout, setAndStoreToken } = useAuth();
  const [page, setPage] = React.useState<Page>("login");
  const [selectedScanId, setSelectedScanId] = React.useState<string | null>(null);

  // Handle OAuth callback redirect with token in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken && !token) {
      setAndStoreToken(urlToken);
      setPage("list");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token, setAndStoreToken]);

  // Auto-login if token exists
  React.useEffect(() => {
    if (token && !loading) {
      setPage("list");
    }
  }, [token, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {token && (
        <nav className="border-b border-gray-800 bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1
              className="text-xl font-bold cursor-pointer"
              onClick={() => setPage("list")}
            >
              🔍 CodeProbe
            </h1>
            <button
              onClick={() => {
                logout();
                setPage("login");
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold transition"
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ErrorBoundary>
          {page === "login" && !token && <LoginPage onLogin={login} />}
          {page === "list" && token && (
            <ScansListPage
              token={token}
              onSelectScan={(id) => {
                setSelectedScanId(id);
                setPage("detail");
              }}
            />
          )}
          {page === "detail" && token && selectedScanId && (
            <ScanDetailPage
              scanId={selectedScanId}
              token={token}
              onBack={() => setPage("list")}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Dashboard />);
