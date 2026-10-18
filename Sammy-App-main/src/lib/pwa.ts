import { useCallback, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

const state = {
  canInstall: false,
  installed:
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true),
};

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function initPWA() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    state.canInstall = true;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    state.canInstall = false;
    state.installed = true;
    emit();
  });
}

export function useInstall() {
  const snap = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state
  );
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      deferred = null;
      state.canInstall = false;
      emit();
      return true;
    }
    return false;
  }, []);
  return { canInstall: snap.canInstall, installed: snap.installed, promptInstall };
}
