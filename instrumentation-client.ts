import { startAnalytics } from "@/lib/analytics/client";
import { consentFromCookieHeader } from "@/lib/consent/consent";

if (consentFromCookieHeader(document.cookie) === "granted") startAnalytics();
