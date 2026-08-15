import { Mail, Phone, MapPin, Facebook, Youtube, Music2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useBranding } from "../context/BrandingContext.jsx";
import logoImage from "../../images/1.jpeg";

const quickLinks = [
  { label: "الرئيسية", href: "#" },
  { label: "الكورسات", href: "#courses" },
  { label: "المميزات", href: "#features" },
  { label: "Conditions & Terms", href: "/terms" },
];

export default function Footer() {
  const { supportEmail, footerText } = useBranding();
  const navigate = useNavigate();

  function goToSection(href) {
    const sectionId = href === "#" ? "" : href.replace(/^#/, "");

    navigate("/", { replace: false });

    window.setTimeout(() => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-chem-light/20 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-center sm:text-right">
        <section className="space-y-4" aria-label="معلومات المنصة">
          <div className="flex items-center gap-3 justify-center sm:justify-end">
            <span className="text-2xl font-extrabold text-chem-light">الدكتور مينا موريد</span>
            <img
              src={logoImage}
              alt="الدكتور مينا موريد"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-chem-light/40"
            />
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{footerText}</p>
        </section>

        <nav className="space-y-3" aria-label="روابط سريعة">
          <h4 className="font-bold text-white">روابط سريعة</h4>
          <ul className="space-y-2 text-sm">
            {quickLinks.map((l) => (
              <li key={l.label}>
                {l.href.startsWith("#") ? (
                  <button
                    type="button"
                    onClick={() => goToSection(l.href)}
                    className="hover:text-chem-light transition-colors duration-200"
                  >
                    {l.label}
                  </button>
                ) : (
                  <Link to={l.href} className="hover:text-chem-light transition-colors duration-200">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section className="space-y-3" aria-label="بيانات التواصل">
          <h4 className="font-bold text-white">تواصل معنا</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span dir="ltr" className="font-medium text-slate-200">abdoaladawy2000@gmail.com</span>
              <Mail size={16} />
            </li>
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span dir="ltr" className="font-medium text-slate-200">01555538712</span>
              <Phone size={16} />
            </li>
            <li className="flex items-center gap-2 justify-center sm:justify-end">
              <span>القاهرة، مصر</span>
              <MapPin size={16} />
            </li>
          </ul>
        </section>

        <section className="space-y-3" aria-label="تابعنا">
          <h4 className="font-bold text-white">تابعنا</h4>
          <div className="flex items-center gap-3 justify-center sm:justify-end">
            <a
              href="https://www.facebook.com/dr.mena.morid"
              target="_blank"
              rel="noreferrer"
              aria-label="فيسبوك"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-chem-light hover:text-slate-950 transition-all duration-300"
            >
              <Facebook size={16} />
            </a>
            <a
              href="https://www.youtube.com/@dr.mena_morid"
              target="_blank"
              rel="noreferrer"
              aria-label="يوتيوب"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-chem-light hover:text-slate-950 transition-all duration-300"
            >
              <Youtube size={16} />
            </a>
            <a
              href="https://www.tiktok.com/@mena.morid"
              target="_blank"
              rel="noreferrer"
              aria-label="تيك توك"
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-chem-light hover:text-slate-950 transition-all duration-300"
            >
              <Music2 size={16} />
            </a>
          </div>
        </section>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
        <p>© {new Date().getFullYear()} منصة الدكتور مينا موريد. جميع الحقوق محفوظة.</p>
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2" dir="ltr">
          <span className="text-slate-400">Developed by</span>
          <a
            href="https://www.facebook.com/engineerabdoaladawey"
            target="_blank"
            rel="noreferrer"
            className="font-extrabold text-chem-light hover:text-chem-cta transition-colors duration-200"
          >
            Abdo Al Adawy
          </a>
        </p>
      </div>
    </footer>
  );
}
