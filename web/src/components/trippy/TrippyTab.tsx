import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { PlayIcon, StopIcon, SignalIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { GuideSection } from "@/components/irantools/GuideSection";

interface HopStats {
  number: number; host: string; ip: string;
  sent: number; recv: number; loss: number;
  last: number; avg: number; best: number;
  worst: number; stddev: number;
}
interface HopRTT { number: number; rtt: number; timeout: boolean; }
interface HistoryPoint { timestamp: number; hops: HopRTT[]; }
interface TrippyStatus {
  running: boolean; host: string; cycles: number;
  hops: HopStats[]; history: HistoryPoint[];
  lastUpdate: number; error?: string;
}

const HOP_COLORS = [
  "#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6",
  "#ec4899","#06b6d4","#84cc16","#f97316","#6366f1",
];

export function TrippyTab() {
  const { t } = useTranslation();
  const [host, setHost] = useState("");
  const [status, setStatus] = useState<TrippyStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/trippy/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data: TrippyStatus = await res.json();
      setStatus(data);
      setIsRunning(data.running);
      if (data.error) setError(data.error);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isRunning) pollRef.current = setInterval(fetchStatus, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isRunning, fetchStatus]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleStart = async () => {
    if (!host.trim()) { setError(t("trippy.hostRequired", "Please enter a host")); return; }
    setError(null);
    try {
      const res = await fetch("/api/trippy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: host.trim(), max_history: 60 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to start"); }
      setIsRunning(true);
      setTimeout(fetchStatus, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  };

  const handleStop = async () => {
    try {
      await fetch("/api/trippy/stop", { method: "POST" });
      setIsRunning(false);
      if (pollRef.current) clearInterval(pollRef.current);
      fetchStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to stop");
    }
  };

  const chartData = status?.history?.map((point) => {
    const row: Record<string, number | string> = {
      time: new Date(point.timestamp).toLocaleTimeString(),
    };
    for (const hop of point.hops) {
      if (!hop.timeout) row["hop" + hop.number] = hop.rtt;
    }
    return row;
  }) || [];

  const activeHops = status?.hops?.filter((h) => h.recv > 0).slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SignalIcon className="w-7 h-7 text-cyan-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("trippy.title", "Continuous Traceroute")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("trippy.description", "Real-time per-hop latency, loss & jitter monitoring")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isRunning && handleStart()}
          placeholder={t("trippy.hostPlaceholder", "e.g. 8.8.8.8 or google.com")}
          disabled={isRunning}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
        />
        {!isRunning ? (
          <Button onClick={handleStart} variant="primary" className="gap-2">
            <PlayIcon className="w-4 h-4" />
            {t("trippy.start", "Start")}
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="gap-2">
            <StopIcon className="w-4 h-4" />
            {t("trippy.stop", "Stop")}
          </Button>
        )}
        {isRunning && status && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("trippy.cycles", "Cycles")}: {status.cycles} | {status.host}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t("trippy.latencyChart", "Latency Over Time (ms)")}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} unit="ms" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#9ca3af" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {activeHops.map((hop, idx) => (
                  <Line key={hop.number} type="monotone" dataKey={"hop" + hop.number} name={"#" + hop.number + " " + (hop.host || hop.ip)} stroke={HOP_COLORS[idx % HOP_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}


      {status && status.hops && status.hops.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-start">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">#</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.hostCol", "Host")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.loss", "Loss%")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.sent", "Snt/Rcv")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.last", "Last")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.avg", "Avg")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.best", "Best")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.worst", "Worst")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("trippy.jitter", "Jitter")}</th>
              </tr>
            </thead>
            <tbody>
              {status.hops.map((hop) => (
                <tr key={hop.number} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-mono text-gray-500">{hop.number}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {hop.host === "*" ? "???" : hop.host}
                    </span>
                    {hop.ip && hop.ip !== hop.host && hop.ip !== "*" && (
                      <span className="ms-1 text-xs text-gray-400">({hop.ip})</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={hop.loss > 50 ? "text-red-500 font-semibold" : hop.loss > 0 ? "text-amber-500" : "text-green-500"}>
                      {hop.loss.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{hop.sent}/{hop.recv}</td>
                  <td className="px-4 py-2 font-mono">{hop.last > 0 ? hop.last.toFixed(1) + "ms" : "-"}</td>
                  <td className="px-4 py-2 font-mono">{hop.avg > 0 ? hop.avg.toFixed(1) + "ms" : "-"}</td>
                  <td className="px-4 py-2 font-mono text-green-600 dark:text-green-400">
                    {hop.best < 999999 ? hop.best.toFixed(1) + "ms" : "-"}
                  </td>
                  <td className="px-4 py-2 font-mono text-red-600 dark:text-red-400">
                    {hop.worst > 0 ? hop.worst.toFixed(1) + "ms" : "-"}
                  </td>
                  <td className="px-4 py-2 font-mono text-purple-600 dark:text-purple-400">
                    {hop.stddev > 0 ? hop.stddev.toFixed(1) + "ms" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {!isRunning && (!status || !status.hops || status.hops.length === 0) && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <SignalIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t("trippy.empty", "Enter a host and press Start to begin continuous tracing")}</p>
        </div>
      )}

      {/* Trippy Guide */}
      <GuideSection title={t("trippy.guide.title", "About Trippy (Continuous Traceroute)")}>
        <p>{t("trippy.guide.p1", "Trippy performs a continuous, real-time traceroute — similar to the classic MTR (My Traceroute) tool — giving you live per-hop statistics as long as it runs.")}</p>
        <p>{t("trippy.guide.p2", "Unlike a one-shot traceroute, Trippy keeps probing each hop repeatedly and accumulates statistics, making it ideal for diagnosing intermittent issues and identifying unstable network paths.")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("trippy.guide.li1", "Enter any hostname or IP address (e.g. 8.8.8.8 or google.com) and click Start.")}</li>
          <li>{t("trippy.guide.li2", "Each row in the table represents one router hop on the path to your destination.")}</li>
          <li>{t("trippy.guide.li3", "Loss% shows the percentage of probes that did not receive a reply — high loss at a single hop is not always a problem if subsequent hops respond normally.")}</li>
          <li>{t("trippy.guide.li4", "Jitter is the variation in round-trip time — high jitter indicates an unstable connection.")}</li>
          <li>{t("trippy.guide.li5", "The chart at the top shows how latency evolves over time for each hop.")}</li>
          <li>{t("trippy.guide.li6", "Click Stop to halt continuous tracing.")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}
