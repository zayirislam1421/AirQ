"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

export function RefreshDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ingest/realtime");
      const result = await response.json();

      if (result.status === "ok") {
        setLastRefresh(new Date().toLocaleTimeString());
        // Optional: reload page to show fresh data
        window.location.reload();
      } else {
        alert(`Refresh failed: ${result.reason || result.status}`);
      }
    } catch (error) {
      alert("Error refreshing data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
        title="Fetch fresh weather data from data.gov.in"
      >
        <RotateCcw size={16} className={isLoading ? "animate-spin" : ""} />
        {isLoading ? "Refreshing..." : "Refresh Data"}
      </button>
      {lastRefresh && (
        <span className="text-sm text-gray-600">
          Last refreshed: {lastRefresh}
        </span>
      )}
    </div>
  );
}
