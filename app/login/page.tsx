// app/login/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setError("Invalid token. Try again.");
        return;
      }
      router.push("/examination");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-[#ddd] p-6 space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold text-[#333]">MoEEE Admin</h1>
          <p className="text-[13px] text-[#777] mt-0.5">
            Enter your access token to continue.
          </p>
        </div>

        {error && (
          <div className="bg-[#f2dede] border border-[#ebccd1] text-[#a94442] text-[13px] px-3 py-2 rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-[#555] mb-1">
              Access token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token…"
              className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[14px] text-[#333] bg-white focus:outline-none focus:border-[#337ab7]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2 text-[14px] text-white bg-[#337ab7] border border-[#2e6da4] rounded-sm hover:bg-[#286090] disabled:opacity-60 transition-colors"
          >
            {loading ? "Verifying…" : "Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}
