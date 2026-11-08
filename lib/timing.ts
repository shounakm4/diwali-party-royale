export type Timings = {
  bluffWrite: number;
  bluffVote: number;
  likelyPredict: number;
  likelyVote: number;
};

export const DEFAULT_TIMINGS: Timings = {
  bluffWrite: 60,
  bluffVote: 45,
  likelyPredict: 20,
  likelyVote: 45,
};

export const TIMING_FIELDS: { key: keyof Timings; label: string }[] = [
  { key: "bluffWrite", label: "Bluff Masters · write a bluff" },
  { key: "bluffVote", label: "Bluff Masters · vote" },
  { key: "likelyPredict", label: "Most Likely To · predict" },
  { key: "likelyVote", label: "Most Likely To · vote" },
];

export function roundTimings(timings?: Timings): Timings {
  return { ...DEFAULT_TIMINGS, ...timings };
}
