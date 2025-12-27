"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const [mobileLink, setMobileLink] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  function clearToastTimer() {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

  function showToast(message: string) {
    setToast(message);
    clearToastTimer();
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function isTouchDevice() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
  }

  async function handleShare() {
    if (busy) return;

    setBusy(true);
    setToast(null);
    setHovering(false); // PC: replace hover help
    setMobileLink(null);

    try {
      const currentUrl = window.location.href;

      if (currentUrl.includes("/share/")) {
        showToast("This page is already a short link");
        return;
      }

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !data.shortUrl) {
        showToast("Failed to create link");
        return;
      }

      const shortUrl = data.shortUrl;

      if (!isTouchDevice()) {
        try {
          await navigator.clipboard.writeText(shortUrl);
        } catch {
          fallbackCopy(shortUrl);
        }
        showToast("Link created and copied to clipboard");
      } else {
        // Mobile: show persistent copy box only
        setMobileLink(shortUrl);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      clearToastTimer();
    };
  }, []);

  return (
    <main
  className="relative min-h-screen"
  style={{
    backgroundImage: "url(/mapback.png)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left top",
    backgroundSize: "cover",
  }}
>




      {/* Share controls */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={handleShare}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          disabled={busy}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-50"
          aria-label="Share map"
        >
          <Image src="/share.svg" alt="Share" width={22} height={22} />
        </button>

        {/* Mobile-only info button (lighter, secondary) */}
        <button
          onClick={() =>
            showToast("Create a short link for the current map view")
          }
          className="block md:hidden w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs text-gray-700"
          aria-label="Share help"
        >
          ⓘ
        </button>
      </div>

      {/* Desktop hover help (instructional) */}
      {hovering && !toast && (
        <div className="fixed top-20 left-4 z-50 text-xs text-gray-700 bg-white shadow rounded px-3 py-2">
          Create a short link for the current map view
        </div>
      )}

      {/* Mobile help toast (instructional, near icons) */}
      {toast && isTouchDevice() && !mobileLink && (
        <div
          className="fixed top-20 left-4 z-50 text-xs text-gray-700 bg-white shadow rounded px-3 py-2"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      {/* Mobile persistent copy box */}
      {mobileLink && (
        <div className="fixed top-20 left-4 z-50 max-w-xs bg-white shadow rounded px-3 py-2 text-sm">
          <div className="text-xs text-gray-600 mb-1">
            Tap and hold to copy
          </div>
          <div className="break-all select-text text-gray-900">
            {mobileLink}
          </div>
        </div>
      )}

      {/* Desktop status toast (green, confirmation) */}
      {toast && !isTouchDevice() && (
        <div
          className="fixed top-20 left-4 z-50 text-xs text-green-800 bg-green-100 rounded px-3 py-2 shadow cursor-pointer"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
