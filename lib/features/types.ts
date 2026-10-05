export type FeatureSceneKey = "start" | "learn" | "hear" | "stories" | "noGuilt" | "progress";

export type FeatureIconKey =
  | "book"
  | "pencil"
  | "globe"
  | "download"
  | "phone"
  | "send"
  | "monitor"
  | "star"
  | "key"
  | "shield";

type FeatureItem = { title: string; body: string };

export type FeatureSection =
  | {
      layout: "split";
      id: string;
      title: string;
      lead: string;
      scene: FeatureSceneKey;
      items: FeatureItem[];
    }
  | {
      layout: "cards";
      id: string;
      title: string;
      lead: string;
      items: (FeatureItem & { icon: FeatureIconKey })[];
    };
