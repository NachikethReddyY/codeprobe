import { useState, useEffect } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("codeprobe_token");
    setToken(stored);
    setLoading(false);
  }, []);

  function login() {
    const clientId = "Ov23liN8SBt9rcom1Msm";
    const redirectUri = "http://localhost:3000/api/auth/github";
    const scope = "user:email";
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = url;
  }

  function logout() {
    localStorage.removeItem("codeprobe_token");
    setToken(null);
  }

  function setAndStoreToken(t: string) {
    localStorage.setItem("codeprobe_token", t);
    setToken(t);
  }

  return { token, loading, login, logout, setAndStoreToken };
}
