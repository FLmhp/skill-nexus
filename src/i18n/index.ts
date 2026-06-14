import i18next from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import zhCommon from "./locales/zh/common.json"
import enCommon from "./locales/en/common.json"

const resources = {
  zh: {
    common: zhCommon,
  },
  en: {
    common: enCommon,
  },
} as const

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["navigator", "htmlTag"],
      caches: [],
    },
  })

export default i18next
