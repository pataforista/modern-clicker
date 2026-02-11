export function startSimulator({ emitVote, emitStatus, intervalMs = 350 } = {}) {
  if (!emitVote) throw new Error("startSimulator requires emitVote()");

  if (emitStatus) {
    emitStatus({ mode: "simulator", connected: true, lastError: null });
  }

  const keys = ["A", "B", "C", "D", "E"];
  let n = 0;

  const timer = setInterval(() => {
    n += 1;
    const vote = {
      id: String(1000 + (n % 35)).padStart(4, "0"),
      key: keys[Math.floor(Math.random() * keys.length)],
      ts: Date.now(),
      source: "sim"
    };
    emitVote(vote);
  }, intervalMs);

  return () => {
    clearInterval(timer);
    if (emitStatus) {
      emitStatus({ mode: "simulator", connected: false, lastError: "Stopped" });
    }
  };
}
