import { CollectionTermsScene } from "@/components/illustrations/scenes/collection-terms";
import { CollectionVocabularyScene } from "@/components/illustrations/scenes/collection-vocabulary";
import type { CollectionKind } from "@/lib/terms/kinds";

export function CollectionScene({ kind }: { kind: CollectionKind }) {
  return kind === "vocabulary" ? <CollectionVocabularyScene /> : <CollectionTermsScene />;
}
