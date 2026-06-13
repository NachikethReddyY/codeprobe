import React, { useEffect, useState } from "react";
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
  const [page, setPage] = useState<Page>("login");
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code && !token) {
      const apiBase = window.location.origin;
      fetch(`${apiBase}/api/auth/github?code=${code}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setAndStoreToken(data.token);
            setPage("list");
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            alert("Authentication failed. Try again.");
          }
        })
        .catch((e) => {
          console.error("OAuth error:", e);
          alert("Authentication failed. Try again.");
        });
    }
  }, [token, setAndStoreToken]);

  // Auto-login if token exists
  useEffect(() => {
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
            <h1 className="text-xl font-bold cursor-pointer" onClick={() => setPage("list")}>
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
            <ScansListPage token={token} onSelectScan={(id) => {
              setSelectedScanId(id);
              setPage("detail");
            }} />
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

      <footer className="border-t border-gray-800 bg-gray-800 mt-8 py-4 text-center text-gray-400 text-sm">
        <p>Powered by <span className="font-semibold text-white">Daytona</span> | <span className="font-semibold text-white">Bright Data</span> | <span className="font-semibold text-white">Nosana</span></p>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Dashboard />);
