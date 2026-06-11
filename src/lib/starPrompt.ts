// Client-side, privacy-preserving state for the "deixe uma estrela" prompt.
// Stored under its own localStorage key so resetting the grades does NOT
// re-trigger the prompt. We can't know if a visitor actually starred the repo
// (that needs GitHub OAuth + a backend), so we treat "clicked the star CTA" as
// the signal and never nag again after that.

export const REPO_URL = "https://github.com/henriquegpb/GradesInteli";

const STORAGE_KEY = "gi-star-v1";

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
const MIN_IMPORTS = 2; // only after the tool has demonstrably helped them
const MAX_DISMISS = 3; // give up gracefully — never beg

export interface StarPromptState {
  clickedStar: boolean; // clicked the star CTA anywhere -> suppress forever
  dismissCount: number; // how many times they dismissed
  lastShownAt: number; // epoch ms, 0 = never shown
  importCount: number; // successful imports (value gate)
}

const DEFAULT: StarPromptState = {
  clickedStar: false,
  dismissCount: 0,
  lastShownAt: 0,
  importCount: 0,
};

export function loadStarState(): StarPromptState {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<StarPromptState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStarState(state: StarPromptState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function canShowStarPrompt(state: StarPromptState, now: number): boolean {
  if (state.clickedStar) return false;
  if (state.importCount < MIN_IMPORTS) return false;
  if (state.dismissCount >= MAX_DISMISS) return false;
  if (now - state.lastShownAt < FIVE_DAYS) return false;
  return true;
}
