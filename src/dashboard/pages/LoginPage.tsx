import React from "react";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-4xl font-bold mb-4">CodeProbe Dashboard</h1>
        <p className="text-gray-300 mb-8">
          Log in with GitHub to view your scan results and security insights.
        </p>
        <button
          onClick={onLogin}
          className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition"
        >
          Login with GitHub
        </button>
        <p className="text-gray-500 text-sm mt-6">
          We'll only access your public profile data.
        </p>
      </div>
    </div>
  );
}
