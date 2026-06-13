import { useState, useEffect } from "react";

export function useScan(scanId: string | null, token: string | null) {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId || !token) return;

    async function fetchScan() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:3000/api/scans/${scanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch scan");
        const data = await res.json();
        setScan(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchScan();
  }, [scanId, token]);

  return { scan, loading, error };
}

export function useScans(token: string | null) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchScans() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:3000/api/scans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch scans");
        const data = await res.json();
        setScans(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchScans();
  }, [token]);

  return { scans, loading, error };
}
