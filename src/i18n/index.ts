import { useSyncExternalStore } from "react";
import { en } from "./en";
import { zh } from "./zh";

export type Language = "en" | "zh";

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationDict = { [key: string]: TranslationValue };

const STORAGE_KEY = "skillNexusLanguage";
const dictionaries: Record<Language, TranslationDict> = { en, zh };
const listeners = new Set<() => void>();

let currentLanguage: Language = readInitialLanguage();

export function setLanguage(language: Language) {
  currentLanguage = language;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, language);
  }
  listeners.forEach((listener) => listener());
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function translate(key: string, vars?: Record<string, string | number>): string {
  const value = resolveValue(dictionaries[currentLanguage], key) ?? resolveValue(en, key);
  if (typeof value !== "string") return key;
  return interpolate(value, vars);
}

export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return {
    language,
    setLanguage,
    t: translate,
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readInitialLanguage(): Language {
  if (typeof localStorage === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function resolveValue(dict: TranslationDict, key: string): TranslationValue | undefined {
  let current: TranslationValue | undefined = dict;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(value: string, vars?: Record<string, string | number>) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
