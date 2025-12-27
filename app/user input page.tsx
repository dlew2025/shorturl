"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const toastTimerRef = useRef<number | null>(null);

  async function generate() {
    if (!url.trim() || busy) return;

    setBusy(true);
    setResult(null);
    setCopied(false);
    setShowToast(false);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult({ error: data?.error || "Failed to generate short URL." });
      } else {
        setResult(data);
        setShowToast(true);

        // auto-hide toast after 3 seconds
        toastTimerRef.current = window.setTimeout(() => {
          setShowToast(false);
        }, 3000);

        // delay fade start by 1.5s, then fade out
        setTimeout(() => {
          setIsFading(true);

          // fade duration (~0.7s), then clear input + fade back in
          setTimeout(() => {
            setUrl("");
            setIsFading(false);
          }, 700);
        }, 1500);
      }
    } catch (e: any) {
      setResult({ error: e?.message || "Network error." });
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      generate();
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function dismissToast() {
    setShowToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

 function useCurrentPageUrl() {
  if (typeof window === "undefined") return;
  setUrl(window.location.href);
}


  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const localUrl = result?.shortUrl;
  const prodUrl = localUrl
    ? localUrl.replace("http://localhost:3000", "https://mapzamurai.com")
    : null;

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 relative">
        <h1 className="text-2xl font-semibold mb-2">
          MapZamurai Short URL Generator
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Slice your URL into something smaller and more manageable.
        </p>

        <div className="flex gap-2 mb-2">
          <input
            className={`flex-1 border rounded-lg px-3 py-2 text-sm transition-opacity duration-700 ${
              isFading ? "opacity-0" : "opacity-100"
            }`}
            placeholder="https://mapzamurai.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />
          <button
            onClick={generate}
            disabled={busy || !url.trim()}
            className="px-4 py-2 rounded-lg text-sm text-white bg-black disabled:bg-gray-400"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={useCurrentPageUrl}
            className="text-sm px-3 py-1 rounded border bg-white"
          >
            Use current page URL
          </button>
        </div>

        {result?.error && (
          <div className="mt-4 text-sm text-red-600">
            {result.error}
          </div>
        )}

        {localUrl && (
          <div className="mt-4 border rounded-lg p-4 bg-gray-50 relative">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <span>Short URL</span>

              {showToast && (
                <span
                  onClick={dismissToast}
                  className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 cursor-pointer select-none"
                  title="Click to dismiss"
                >
                  Short URL successfully created
                </span>
              )}
            </div>

            <div className="mb-3">
              <div className="font-mono text-sm break-all mb-1">
                {localUrl}{" "}
                <span className="text-gray-500">
                  ({prodUrl})
                </span>
              </div>
              <button
                onClick={() => copy(localUrl)}
                className="text-sm px-3 py-1 rounded border bg-white"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
