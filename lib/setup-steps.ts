export type SetupSignals = {
  redeemed: boolean;
  reserved: boolean;
  databaseReady: boolean;
  pulling: boolean;
  starting: boolean;
  serving: boolean;
};

export type StepState = {
  id: "accepted" | "reserved" | "database" | "download" | "start" | "open";
  label: string;
  sub?: string;
  done: boolean;
  current: boolean;
  doneAt: number | null;
};

const STEPS: { id: StepState["id"]; label: string; sub?: string; signal: keyof SetupSignals }[] = [
  { id: "accepted", label: "Invite code accepted", signal: "redeemed" },
  {
    id: "reserved",
    label: "Your environment is reserved",
    sub: "its own address and storage, only yours",
    signal: "reserved",
  },
  { id: "database", label: "Database ready", signal: "databaseReady" },
  {
    id: "download",
    label: "Downloading Sektar",
    sub: "the first start fetches the app",
    signal: "pulling",
  },
  { id: "start", label: "Starting Sektar", signal: "starting" },
  { id: "open", label: "Opening it for you", signal: "serving" },
];

/** A step is done when its signal or a later step's signal is true, or it was done before. */
export function setupSteps(
  signals: SetupSignals,
  previous: StepState[] | null,
  now: number,
): StepState[] {
  const steps = STEPS.map((step, index) => {
    const before = previous?.find((p) => p.id === step.id);
    const reached = STEPS.slice(index).some((s) => signals[s.signal]);
    const done = reached || Boolean(before?.done);
    const state: StepState = {
      id: step.id,
      label: step.label,
      done,
      current: false,
      doneAt: done ? (before?.done ? before.doneAt : now) : null,
    };
    if (step.sub) state.sub = step.sub;
    return state;
  });
  const current = steps.find((s) => !s.done);
  if (current) current.current = true;
  return steps;
}
