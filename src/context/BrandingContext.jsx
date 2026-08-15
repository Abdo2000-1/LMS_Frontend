import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../lib/apiClient.js";

const BrandingContext = createContext(null);

const fixedBranding = {
  teacherDisplayName: "Mena Mourid",
  englishBrandName: "MENA MOURID",
  logoUrl: "",
  primaryColor: "#00A8E8",
  supportEmail: "support@menamourid.com",
  footerText: "منصة الدكتور مينا موريد للكيمياء: تجارب عملية، متابعة مستمرة، وتقفيل المادة من أول مرة.",
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(fixedBranding);

  useEffect(() => {
    apiClient
      .get("/api/branding", { skipGlobalErrorToast: true })
      .then(({ data }) => {
        setBranding({
          ...fixedBranding,
          primaryColor: data.primaryColor || fixedBranding.primaryColor,
          supportEmail: data.supportEmail || fixedBranding.supportEmail,
        });
      })
      .catch(() => setBranding(fixedBranding));
  }, []);

  const value = useMemo(() => branding, [branding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding لازم يتستخدم جوه BrandingProvider");
  return ctx;
}
