export const DAY_TYPE_LABELS: Record<string, string> = {
  chest_back: "Chest & Back",
  legs_core: "Legs & Core",
  shoulders_arms: "Shoulders & Arms",
  full_body: "Full Body",
};

export const DAY_TYPE_OPTIONS = [
  { value: "", label: "No type" },
  { value: "chest_back", label: "Chest & Back" },
  { value: "legs_core", label: "Legs & Core" },
  { value: "shoulders_arms", label: "Shoulders & Arms" },
  { value: "full_body", label: "Full Body" },
];

export function dayTypeLabel(t: string | null | undefined, fallback = "Training Session") {
  if (!t) return fallback;
  // Map legacy enum values (chest_back, etc.) to their pretty label.
  // Free-text values (e.g. "Chest & Back" or any custom string) pass through.
  return DAY_TYPE_LABELS[t] ?? t;
}
