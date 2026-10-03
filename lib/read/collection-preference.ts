import { createCollectionPreference } from "@/lib/study/collection-preference";

const readCollection = createCollectionPreference("lb-read-collection");

export const READ_COLLECTION_COOKIE = readCollection.cookieName;
export const parseReadCollectionCookie = readCollection.parse;
export const saveReadCollectionPreference = readCollection.save;
