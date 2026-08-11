import { Languages, Mail, Phone, MapPin, Facebook, Youtube, Instagram } from "lucide-react";
import { useBranding } from "../context/BrandingContext.jsx";

const quickLinks = [
  { label: "الرئيسية", href: "#" },
  { label: "الكورسات", href: "#courses" },
  { label: "السنوات الدراسية", href: "#grades" },
  { label: "آراء الطلاب", href: "#testimonials" },
];

export default function Footer() {
  const { teacherDisplayName, logoUrl, supportEmail, footerText } = useBranding();

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-amber-500/20 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-center sm:text-right">
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <span className="text-2xl font-extrabold text-amber-400">{teacherDisplayName}</span>
            <span className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt={teacherDisplayName} className="h-full w-full object-cover" /> : <Languages size={20} />}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {footerText || "منصة تعليمية متخصصة في اللغة العربية، بتقدّم شرح مبسط ومتابعة مستمرة عشان توصل لأعلى الدرجات في الثانوية العامة."}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-white">روابط سريعة</h4>
          <ul className="space-y-2 text-sm">
            {quickLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-amber-400 transition-colors duration-200">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-white">تواصل معنا</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span>{supportEmail || "info@alostaz-platform.com"}</span>
              <Mail size={16} />
            </li>
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span dir="ltr">01000000000</span>
              <Phone size={16} />
            </li>
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span>القاهرة، مصر</span>
              <MapPin size={16} />
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-white">تابعنا</h4>
          <div className="flex items-center gap-3 justify-center sm:justify-end">
            <a
              href="#"
              aria-label="فيسبوك"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-all duration-300"
            >
              <Facebook size={16} />
            </a>
            <a
              href="#"
              aria-label="يوتيوب"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-all duration-300"
            >
              <Youtube size={16} />
            </a>
            <a
              href="#"
              aria-label="إنستجرام"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-all duration-300"
            >
              <Instagram size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} منصة {teacherDisplayName}. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
