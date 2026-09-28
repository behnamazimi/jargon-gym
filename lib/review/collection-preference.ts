import { createCollectionPreference } from "@/lib/study/collection-preference";

const reviewCollection = createCollectionPreference("jg-review-collection");

export const REVIEW_COLLECTION_COOKIE = reviewCollection.cookieName;
export const parseReviewCollectionCookie = reviewCollection.parse;
export const saveReviewCollectionPreference = reviewCollection.save;
export const clearReviewCollectionPreference = reviewCollection.clear;
