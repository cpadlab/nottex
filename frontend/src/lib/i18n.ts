import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import esTranslations from '@/assets/locales/es.json'
import enTranslations from '@/assets/locales/en.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            es: { translation: esTranslations },
            en: { translation: enTranslations },
        },
        fallbackLng: 'es',
        lng: 'es',
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n