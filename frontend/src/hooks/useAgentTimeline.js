import { useEffect, useMemo, useState } from 'react';

const AGENTS = ['INTAKE', 'EXTRACTION', 'POLICY', 'VALIDATION', 'ADJUDICATION'];
const SUBS = ['NOAA', 'NHTSA', 'ISO', 'NICB', 'DMV', 'Telematics', 'EstimateRule'];

/**
 * Plays an agent timeline. Returns the live state.
 *
 * @param timeline  Array of events from agentTimelines.js
 * @param opts      { speed: 1, autoStart: true, baseTimeISO?: string }
 */
export default function useAgentTimeline(timeline, opts = {}) {
  const { speed: initialSpeed = 1, autoStart = true } = opts;

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(autoStart);
  const [speed, setSpeed] = useState(initialSpeed);

  const totalDuration = timeline.length ? timeline[timeline.length - 1].at : 0;

  useEffect(() => {
    if (!playing) return;
    const tickMs = 80;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + tickMs * speed;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [playing, speed, totalDuration]);

  const events = useMemo(() => timeline.filter((e) => e.at <= elapsed), [timeline, elapsed]);

  // Agent + sub states derived from events seen so far
  const { agents, subs, latencies, summaries, narrate } = useMemo(() => {
    const ag = Object.fromEntries(AGENTS.map((a) => [a, 'idle']));
    const su = Object.fromEntries(SUBS.map((s) => [s, 'idle']));
    const lat = {};
    const sum = {};
    let lastNarrate = null;
    events.forEach((e) => {
      if (e.agent) {
        ag[e.agent] = e.state;
        if (e.latency != null) lat[e.agent] = e.latency;
        if (e.summary) sum[e.agent] = e.summary;
      }
      if (e.sub) {
        su[e.sub] = e.state;
        if (e.summary) sum[e.sub] = e.summary;
      }
      if (e.narrate) lastNarrate = e.narrate;
    });
    return { agents: ag, subs: su, latencies: lat, summaries: sum, narrate: lastNarrate };
  }, [events]);

  // Glass Box live feed
  const log = useMemo(() => {
    const base = opts.baseTimeISO ? new Date(opts.baseTimeISO).getTime() : null;
    return events
      .filter((e) => e.gb)
      .map((e, idx) => ({
        idx,
        at: e.at,
        ts: base ? formatClock(new Date(base + e.at)) : `T+${(e.at / 1000).toFixed(1)}s`,
        agent: e.gb.agent,
        text: e.gb.text,
        cite: e.gb.cite,
        flag: !!e.gb.flag
      }));
  }, [events, opts.baseTimeISO]);

  const verdict = events.find((e) => e.type === 'verdict')?.verdict || null;

  const restart = () => {
    setElapsed(0);
    setPlaying(true);
  };

  return {
    elapsed,
    totalDuration,
    progress: totalDuration ? Math.min(1, elapsed / totalDuration) : 0,
    playing,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    restart,
    agents,
    subs,
    latencies,
    summaries,
    narrate,
    log,
    verdict
  };
}

function formatClock(date) {
  return date.toLocaleTimeString('en-US', { hour12: false }) + '.' +
    String(date.getMilliseconds()).padStart(3, '0').slice(0, 2);
}
