import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

export default function TermsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F9FF] text-slate-950 font-['Cairo',_sans-serif]">
      <AppHeader active="/terms" />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <section className="rounded-[1.75rem] border border-cyan-100 bg-white p-8 shadow-xl shadow-cyan-900/10">
          <h1 className="text-3xl font-black text-[#0077B6]">Conditions & Terms</h1>
          <p className="mt-3 text-slate-600 leading-8 font-medium">
            هذه الصفحة توضّح قواعد الاستخدام العامة للمنصة، وحقوق الطالب والمدرس، وطريقة التعامل مع المحتوى
            التعليمي والدفع والخصوصية. عند استخدامك للمنصة فأنت توافق على الالتزام بالقواعد الخاصة بها.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-black text-slate-900">الوصول للمحتوى</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                المحتوى المدفوع يظل محصورًا للمصرّح لهم فقط، والمحتوى المجاني متاح مباشرة دون أي خطوات دفع.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-black text-slate-900">الحقوق والاستخدام</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                يمنع إعادة نشر المحتوى أو مشاركته خارج المنصة دون إذن، كما يجب الحفاظ على سلامة الحسابات.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
