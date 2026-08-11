import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../lib/apiClient.js";

const BrandingContext = createContext(null);

const defaultBranding = {
  teacherDisplayName: "الأستاذ",
  logoUrl: "",
  primaryColor: "#2563EB",
  supportEmail: "",
  footerText: "",
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(defaultBranding);

  useEffect(() => {
    apiClient
      .get("/api/branding")
      .then(({ data }) => {
        setBranding({
          ...defaultBranding,
          teacherDisplayName: data.teacherDisplayName || defaultBranding.teacherDisplayName,
          logoUrl: data.logoUrl || "",
          primaryColor: data.primaryColor || defaultBranding.primaryColor,
          supportEmail: data.supportEmail || "",
          footerText: data.footerText || "",
        });
      })
      .catch(() => setBranding(defaultBranding));
  }, []);

  const value = useMemo(() => branding, [branding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding لازم يتستخدم جوه BrandingProvider");
  return ctx;
}
