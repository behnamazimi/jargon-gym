import type { CollectionLanguage } from "./languages";

export type TermLabels = {
  mentalModel: string;
  example: string;
  antiExample: string;
  discussion: string;
  controversy: string;
  note: string;
  relatedTerms: string;
  searchOnGoogle: (term: string) => string;
};

export const TERM_LABELS: Record<CollectionLanguage, TermLabels> = {
  en: {
    mentalModel: "Mental model",
    example: "Example",
    antiExample: "Anti-example",
    discussion: "In practice",
    controversy: "Debated",
    note: "Note",
    relatedTerms: "Related terms",
    searchOnGoogle: (term) => `Search “${term}” on Google`,
  },
  nl: {
    mentalModel: "Zie het zo",
    example: "Bijvoorbeeld",
    antiExample: "Zo niet",
    discussion: "In de praktijk",
    controversy: "Discussie",
    note: "Notitie",
    relatedTerms: "Verwante termen",
    searchOnGoogle: (term) => `Zoek “${term}” op Google`,
  },
  es: {
    mentalModel: "Modelo mental",
    example: "Ejemplo",
    antiExample: "Contraejemplo",
    discussion: "En la práctica",
    controversy: "Debatido",
    note: "Nota",
    relatedTerms: "Términos relacionados",
    searchOnGoogle: (term) => `Buscar «${term}» en Google`,
  },
  fr: {
    mentalModel: "Modèle mental",
    example: "Exemple",
    antiExample: "Contre-exemple",
    discussion: "En pratique",
    controversy: "Débattu",
    note: "Note",
    relatedTerms: "Termes liés",
    searchOnGoogle: (term) => `Rechercher « ${term} » sur Google`,
  },
  de: {
    mentalModel: "Denkmodell",
    example: "Beispiel",
    antiExample: "Gegenbeispiel",
    discussion: "In der Praxis",
    controversy: "Umstritten",
    note: "Notiz",
    relatedTerms: "Verwandte Begriffe",
    searchOnGoogle: (term) => `„${term}“ bei Google suchen`,
  },
  it: {
    mentalModel: "Modello mentale",
    example: "Esempio",
    antiExample: "Controesempio",
    discussion: "Nella pratica",
    controversy: "Dibattuto",
    note: "Nota",
    relatedTerms: "Termini correlati",
    searchOnGoogle: (term) => `Cerca «${term}» su Google`,
  },
  pt: {
    mentalModel: "Modelo mental",
    example: "Exemplo",
    antiExample: "Contraexemplo",
    discussion: "Na prática",
    controversy: "Debatido",
    note: "Nota",
    relatedTerms: "Termos relacionados",
    searchOnGoogle: (term) => `Pesquisar “${term}” no Google`,
  },
  ru: {
    mentalModel: "Ментальная модель",
    example: "Пример",
    antiExample: "Контрпример",
    discussion: "На практике",
    controversy: "Спорный момент",
    note: "Заметка",
    relatedTerms: "Связанные термины",
    searchOnGoogle: (term) => `Искать «${term}» в Google`,
  },
  tr: {
    mentalModel: "Zihinsel model",
    example: "Örnek",
    antiExample: "Karşı örnek",
    discussion: "Uygulamada",
    controversy: "Tartışmalı",
    note: "Not",
    relatedTerms: "İlgili terimler",
    searchOnGoogle: (term) => `“${term}” için Google’da ara`,
  },
  ja: {
    mentalModel: "考え方のイメージ",
    example: "例",
    antiExample: "反例",
    discussion: "実際には",
    controversy: "議論あり",
    note: "メモ",
    relatedTerms: "関連用語",
    searchOnGoogle: (term) => `「${term}」をGoogleで検索`,
  },
  ko: {
    mentalModel: "사고 모형",
    example: "예시",
    antiExample: "반례",
    discussion: "실제로는",
    controversy: "논쟁 중",
    note: "메모",
    relatedTerms: "관련 용어",
    searchOnGoogle: (term) => `Google에서 “${term}” 검색`,
  },
  zh: {
    mentalModel: "思维模型",
    example: "例子",
    antiExample: "反例",
    discussion: "实际应用",
    controversy: "有争议",
    note: "备注",
    relatedTerms: "相关术语",
    searchOnGoogle: (term) => `在 Google 上搜索“${term}”`,
  },
};
