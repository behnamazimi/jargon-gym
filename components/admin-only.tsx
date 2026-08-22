"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import {
  getServerShowAdminUi,
  getShowAdminUi,
  setShowAdminUi,
  subscribeShowAdminUi,
} from "@/lib/admin/show-admin-ui";

const AdminContext = createContext(false);

export function AdminProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext);
}

export function useShowAdminUi(): boolean {
  return useSyncExternalStore(subscribeShowAdminUi, getShowAdminUi, getServerShowAdminUi);
}

export { setShowAdminUi };

/** Renders children only for admins who have turned on the local debug overlay switch. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const showAdminUi = useShowAdminUi();
  if (!isAdmin || !showAdminUi) return null;
  return children;
}
