"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  async function shareCurrentPage() {
    if (busy) return;

    setBusy(true);
    setShortUrl(null);
    setCopied(false);
    setMessage(null);

    try {
      const currentUrl = window.location.href;

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data?.error || "Failed to generate share URL.");
        return;
      }

      const generated = data.shortUrl;
      setShortUrl(generated);

      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setMessage("Share URL copied to clipboard");

      // auto-clear message after 3 seconds
      timerRef.current = window.setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-8">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">
          Share this map
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Generate a short link for the current map view and copy it to the clipboard.
        </p>

        <button
          onClick={shareCurrentPage}
          disabled={busy}
          className="w-full px-4 py-3 rounded-lg text-sm text-white bg-black disabled:bg-gray-400"
        >
          {busy ? "Creating share link…" : "Share"}
        </button>

        {message && (
          <div
            onClick={() => setMessage(null)}
            className="mt-4 text-sm text-green-700 bg-green-100 rounded px-3 py-2 cursor-pointer"
            title="Click to dismiss"
          >
            {message}
          </div>
        )}

        {shortUrl && (
          <div className="mt-4 text-xs text-gray-500 break-all">
            {shortUrl}
          </div>
        )}
      </div>
    </main>
  );
}
