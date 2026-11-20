# Frontend languages

The SPA supports English (`en`) and European Portuguese (`pt-PT`) through ngx-translate. The `pt | en` control appears above every route and inside shared dialogs. It changes text in place without navigating or rebuilding forms.

`Language` chooses a valid `laprizza.lang` localStorage preference first, the first supported browser language second, and English otherwise. It saves an explicit choice only after its catalog loads. Failed loads retain the current language and show a retry message. When storage is unavailable, selection still works for the current visit.

Translation providers are registered in `app.config.ts`. The HTTP loader reads `/i18n/en.json` and `/i18n/pt-PT.json`, bypasses API authentication interceptors, and reports load errors instead of caching an empty catalog. English is the fallback. `TranslatedTitle` updates document titles; `Language` updates `<html lang>`.

Catalogs use English source phrases as flat keys. Add the same key to both files, keeping English text in `en.json` and its European Portuguese translation in `pt-PT.json`. Use complete phrases with `{{parameter}}` placeholders for variable content. Import `TranslatePipe` in standalone components and render text with `| translate`. For reactive TypeScript-derived text, track `TranslateService.currentLang()` and translate when rendering/computing, rather than saving a Portuguese string into form state.

`LocalCurrencyPipe` and `LocalDatePipe` pass the active locale explicitly to Angular formatting pipes; Portuguese locale data is registered once. The application does not change `LOCALE_ID` at runtime. Database values are rendered verbatim, including status codes (`ACTIVE`, `DEACTIVATED`, `PENDING_REGISTRATION`) and role identifiers (`ADMINISTRATOR`, `MANAGER`, `EMPLOYEE`, `CUSTOMER`). Do not put database codes or values through `TranslatePipe`, and never translate constants used in comparisons or API payloads. Product names, categories, recipe names, descriptions, usernames and other API business values remain as supplied by the backend. Only interface labels, instructions and messages are translated. Known authentication/recovery responses have catalog entries; unfamiliar backend-provided details are displayed as returned.

Run `npm test -- e2e/i18n.spec.ts` from `frontend/` to verify switching, form preservation, language preference, fallback/retry, titles, currency formatting, business data and responsive controls. The complete browser suite runs with `npm test`.
