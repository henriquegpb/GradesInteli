"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  loadStarState,
  saveStarState,
  canShowStarPrompt,
  REPO_URL,
  type StarPromptState,
} from "@/lib/starPrompt";

/**
 * Drives the GitHub-star prompt. Opens on a "win" moment (a fresh import) or,
 * for returning users who already cleared the value gate, once on app open —
 * always subject to the frequency / dismiss caps in canShowStarPrompt.
 */
export function useStarPrompt(isHydrated: boolean, hasData: boolean, lastImportAt: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const stateRef = useRef<StarPromptState | null>(null);
  const prevImportRef = useRef<string | null>(null);
  const didInitialCheck = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maybeOpen = useCallback((delayMs = 3000) => {
    const s = stateRef.current;
    if (!s) return;
    if (!canShowStarPrompt(s, Date.now())) return;
    const next = { ...s, lastShownAt: Date.now() };
    stateRef.current = next;
    saveStarState(next);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setIsOpen(true), delayMs);
  }, []);

  // clear any pending open timer on unmount
  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  // Load persisted state + run the on-open check for returning users.
  useEffect(() => {
    if (!isHydrated) return;
    if (didInitialCheck.current) return;
    didInitialCheck.current = true;
    stateRef.current = loadStarState();
    prevImportRef.current = lastImportAt;
    if (hasData) maybeOpen();
  }, [isHydrated, hasData, lastImportAt, maybeOpen]);

  // A fresh import bumps the value gate, then we re-check.
  useEffect(() => {
    if (!isHydrated || !stateRef.current) return;
    if (lastImportAt && lastImportAt !== prevImportRef.current) {
      prevImportRef.current = lastImportAt;
      const next = {
        ...stateRef.current,
        importCount: stateRef.current.importCount + 1,
      };
      stateRef.current = next;
      saveStarState(next);
      maybeOpen();
    }
  }, [isHydrated, lastImportAt, maybeOpen]);

  const onStar = useCallback(() => {
    const s = stateRef.current ?? loadStarState();
    const next = { ...s, clickedStar: true };
    stateRef.current = next;
    saveStarState(next);
    setIsOpen(false);
    if (typeof window !== "undefined") {
      window.open(REPO_URL, "_blank", "noopener,noreferrer");
    }
  }, []);

  const onDismiss = useCallback(() => {
    const s = stateRef.current ?? loadStarState();
    const next = { ...s, dismissCount: s.dismissCount + 1 };
    stateRef.current = next;
    saveStarState(next);
    setIsOpen(false);
  }, []);

  // Header star button click also counts as "starred" -> suppress the modal.
  const markStarClicked = useCallback(() => {
    const s = stateRef.current ?? loadStarState();
    const next = { ...s, clickedStar: true };
    stateRef.current = next;
    saveStarState(next);
  }, []);

  return { isOpen, onStar, onDismiss, markStarClicked };
}
