export {
  createTerm,
  updateTerm,
  deleteTerm,
  recordTermReadAction,
  recordReviewRevealAction,
  setTermMarkedKnownAction,
} from "@/app/(private)/jargon/actions-terms";
export {
  addToCollection,
  removeFromCollection,
  toggleActiveForReview,
  shareDomain,
  unshareDomain,
  getDomainSubscriberCount,
  updateOwnedDomain,
  deleteOwnedDomain,
  resetCollectionProgress,
} from "@/app/(private)/jargon/actions-collections";
