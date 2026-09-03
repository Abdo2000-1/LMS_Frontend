import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Clock, HelpCircle, Image, Plus, Trash2, Upload } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { addQuizToCourse, deleteQuizFromCourse, getCourseById, subscribeCourses } from "../services/courseService.js";
import { uploadImageToStorage } from "../services/storageService.js";
import AiExamDocImporter from "../components/AiExamDocImporter.jsx";

const emptyQuestion = () => ({
  type: "mcq",
  prompt: "",
  questionImageUrl: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
  modelAnswer: "",
  gradingRubric: "",
});

export default function AddQuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(searchParams.get("courseId") || "");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [isMandatory, setIsMandatory] = useState(false);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [imageUploadingIndex, setImageUploadingIndex] = useState(-1);

  useEffect(() => {
    const unsub = subscribeCourses((items) => {
      setCourses(items || []);
      if (!courseId && items?.[0]?.id) setCourseId(items[0].id);
    }, true);
    return unsub;
  }, [courseId]);

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.points || 1), 0),
    [questions]
  );

  function handleQuestionsExtracted({ title: extractedTitle, questions: extractedQuestions }) {
    if (extractedTitle && !title.trim()) {
      setTitle(extractedTitle);
    }
    if (extractedQuestions && extractedQuestions.length > 0) {
      setQuestions(extractedQuestions.map((q) => ({
        type: q.type || "mcq",
        prompt: q.prompt || "",
        questionImageUrl: q.questionImageUrl || "",
        choices: q.choices && q.choices.length >= 2 ? q.choices : ["", "", "", ""],
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        points: Number(q.points || 1),
        modelAnswer: q.modelAnswer || "",
        gradingRubric: q.gradingRubric || "",
      })));
      setActiveQuestionIndex(0);
      setNotice(`🎉 تم بنجاح استخراج ${extractedQuestions.length} سؤال من الملف! راجع الأسئلة في القائمة بالأسفل، عدّل الاختيارات، وحدد الإجابة الصحيحة لكل سؤال قبل الحفظ.`);
    }
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setActiveQuestionIndex(questions.length);
  }

  function removeQuestion(index) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setActiveQuestionIndex(Math.max(0, index - 1));
  }

  function updateQuestion(index, field, value) {
    setQuestions((prev) => prev.map((question, itemIndex) => (
      itemIndex === index ? { ...question, [field]: value } : question
    )));
  }

  async function uploadQuestionImage(index, file) {
    if (!file) return;
    setImageUploadingIndex(index);
    try {
      const url = await uploadImageToStorage(file);
      updateQuestion(index, "questionImageUrl", url);
    } finally {
      setImageUploadingIndex(-1);
    }
  }

  function updateChoice(questionIndex, choiceIndex, value) {
    setQuestions((prev) => prev.map((question, itemIndex) => (
      itemIndex === questionIndex
        ? { ...question, choices: question.choices.map((choice, index) => (index === choiceIndex ? value : choice)) }
        : question
    )));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!courseId) return setError("اختار الكورس الذي سيتم إضافة الكويز بداخله.");
    if (!title.trim()) return setError("اكتب عنوان الكويز.");
    if (questions.some((question) => !question.prompt.trim())) return setError("كل سؤال يحتاج نص واضح.");
    if (questions.some((question) => question.type !== "essay" && question.choices.filter((choice) => choice.trim()).length < 2)) {
      return setError("كل سؤال اختيار من متعدد يحتاج اختيارين على الأقل.");
    }

    setIsBusy(true);
    try {
      await addQuizToCourse(courseId, {
        title: title.trim(),
        minutes: Number(minutes || 15),
        questionsCount: questions.length,
        isMandatory,
        questions: questions.map((question, index) => ({
          questionId: `q${Date.now()}_${index}`,
          type: question.type || "mcq",
          prompt: question.prompt.trim(),
          questionImageUrl: question.questionImageUrl || "",
          choices: question.type === "essay" ? [] : question.choices.map((choice) => choice.trim()).filter(Boolean),
          correctIndex: question.type === "essay" ? 0 : question.correctIndex,
          points: Number(question.points || 1),
          modelAnswer: question.type === "essay" ? (question.modelAnswer || "").trim() : null,
          gradingRubric: question.type === "essay" ? (question.gradingRubric || "").trim() : null,
        })),
      });
      setNotice("تم حفظ الكويز بنجاح داخل الكورس.");
      setTitle("");
      setMinutes("15");
      setIsMandatory(false);
      setQuestions([emptyQuestion()]);
      setActiveQuestionIndex(0);
    } catch (err) {
      setError(err.message || "تعذر حفظ الكويز.");
    } finally {
      setIsBusy(false);
    }
  }

  const activeQuestion = questions[activeQuestionIndex];

  return (
    <DashboardLayout active="/teacher/dashboard">
      <main dir="rtl" className="space-y-6 font-['Cairo',sans-serif]">
        <section className="rounded-3xl bg-gradient-to-l from-[#0077B6] to-[#00A8E8] p-6 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/teacher/dashboard")}
              className="rounded-xl bg-white/15 p-2 transition hover:bg-white/25"
            >
              <ArrowRight size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black">إضافة كويز جديد</h1>
              <p className="mt-1 text-sm text-white/75">حدد الكورس، مدة الكويز، درجاته، وهل هو إجباري قبل متابعة المحتوى أم تدريب اختياري.</p>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}>
            {error || notice}
          </div>
        )}

        {/* AI Exam Doc Importer */}
        <AiExamDocImporter onExtracted={handleQuestionsExtracted} />

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#0077B6] dark:text-[#00A8E8]">
              <HelpCircle size={20} />
              بيانات الكويز
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">الكورس</span>
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">اختر الكورس</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">عنوان الكويز</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="مثال: كويز المحاضرة الأولى"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <Clock size={15} />
                  المدة بالدقائق
                </span>
                <input
                  type="number"
                  min="1"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">عدد الأسئلة</p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{questions.length}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الدرجات</p>
                <p className="mt-1 text-2xl font-black text-[#FF6B35]">{totalPoints}</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={(event) => setIsMandatory(event.target.checked)}
                className="h-5 w-5 accent-[#0077B6]"
              />
              كويز إجباري، يجب اجتيازه قبل فتح المحتوى التالي
            </label>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-950 dark:text-white">السؤال {activeQuestionIndex + 1}</h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#005f8e]"
                >
                  <Plus size={15} />
                  سؤال جديد
                </button>
              </div>

              <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveQuestionIndex(index)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      index === activeQuestionIndex
                        ? "bg-[#0077B6] text-white"
                        : "bg-white text-slate-500 hover:text-[#0077B6] dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    س {index + 1}
                  </button>
                ))}
              </div>

              {activeQuestion && (
                <div className="space-y-4">
                  {/* Type Selector Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                    <div className="flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => updateQuestion(activeQuestionIndex, "type", "mcq")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          (activeQuestion.type || "mcq") === "mcq"
                            ? "bg-[#0077B6] text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                        }`}
                      >
                        اختيار من متعدد MCQ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestion(activeQuestionIndex, "type", "essay")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          activeQuestion.type === "essay"
                            ? "bg-[#FF6B35] text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                        }`}
                      >
                        سؤال مقالي Essay
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">النقاط:</span>
                        <input
                          type="number"
                          min="1"
                          value={activeQuestion.points}
                          onChange={(event) => updateQuestion(activeQuestionIndex, "points", Number(event.target.value))}
                          className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(activeQuestionIndex)}
                          className="rounded-xl p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={activeQuestion.prompt}
                    onChange={(event) => updateQuestion(activeQuestionIndex, "prompt", event.target.value)}
                    placeholder="اكتب نص السؤال..."
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    required
                  />

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صورة السؤال (اختياري)</span>
                      <input
                        value={activeQuestion.questionImageUrl}
                        onChange={(event) => updateQuestion(activeQuestionIndex, "questionImageUrl", event.target.value)}
                        placeholder="رابط الصورة أو ارفعه من الجهاز"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="mt-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 transition hover:border-[#0077B6] hover:text-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <Upload size={15} />
                      {imageUploadingIndex === activeQuestionIndex ? "جاري الرفع..." : "رفع صورة"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => uploadQuestionImage(activeQuestionIndex, event.target.files?.[0])}
                      />
                    </label>
                  </div>

                  {activeQuestion.questionImageUrl && (
                    <img
                      src={activeQuestion.questionImageUrl}
                      alt="معاينة صورة السؤال"
                      className="max-h-56 w-full rounded-2xl border border-slate-200 object-contain bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900"
                    />
                  )}

                  {/* Render Essay fields OR MCQ fields */}
                  {activeQuestion.type === "essay" ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">الإجابة النموذجية (Model Answer):</label>
                        <textarea
                          rows={3}
                          value={activeQuestion.modelAnswer || ""}
                          onChange={(e) => updateQuestion(activeQuestionIndex, "modelAnswer", e.target.value)}
                          placeholder="اكتب الإجابة النموذجية للسؤال المقالي لتقييم الذكاء الاصطناعي والمعلم..."
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">معايير التصحيح (Grading Rubric):</label>
                        <textarea
                          rows={2}
                          value={activeQuestion.gradingRubric || ""}
                          onChange={(e) => updateQuestion(activeQuestionIndex, "gradingRubric", e.target.value)}
                          placeholder="اذكر العناصر والمعايير الواجب توفرها في إجابة الطالب للحصول على الدرجة..."
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeQuestion.choices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() => updateQuestion(activeQuestionIndex, "correctIndex", index)}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                              activeQuestion.correctIndex === index
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 text-transparent dark:border-slate-600"
                            }`}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <input
                            value={choice}
                            onChange={(event) => updateChoice(activeQuestionIndex, index, event.target.value)}
                            placeholder={`اختيار ${index + 1}`}
                            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="h-max rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">مراجعة سريعة</h2>
            <div className="mt-4 space-y-3 text-sm font-bold text-slate-600 dark:text-slate-300">
              <p>الكورس: {courses.find((course) => course.id === courseId)?.title || "لم يتم الاختيار"}</p>
              <p>المدة: {minutes || 0} دقيقة</p>
              <p>الأسئلة: {questions.length}</p>
              <p>الدرجات: {totalPoints}</p>
              <p>الحالة: {isMandatory ? "إجباري" : "اختياري"}</p>
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 w-full rounded-2xl bg-[#FF6B35] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-60"
            >
              {isBusy ? "جاري الحفظ..." : "حفظ الكويز"}
            </button>
          </aside>
        </form>

        {/* Existing Quizzes in Selected Course */}
        <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h2 className="font-black text-lg text-[#0077B6] flex items-center gap-2">
            <BookOpen size={18} />
            الكويزات الحالية في الكورس المختار ({courses.find((c) => c.id === courseId)?.title || "..."})
          </h2>
          <div className="space-y-3">
            {(!courses.find((c) => c.id === courseId)?.quizzes || courses.find((c) => c.id === courseId)?.quizzes?.length === 0) ? (
              <p className="text-sm text-slate-500">لا توجد كويزات مضافة في هذا الكورس بعد.</p>
            ) : (
              courses.find((c) => c.id === courseId)?.quizzes?.map((quiz) => (
                <div key={quiz.quizId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{quiz.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {quiz.questions?.length || quiz.questionsCount || 0} أسئلة · {quiz.minutes || 15} دقيقة
                      {quiz.isMandatory ? " · إجباري" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`هل تريد حذف الكويز (${quiz.title}) نهائياً من الكورس؟`)) return;
                      setIsBusy(true);
                      try {
                        await deleteQuizFromCourse(courseId, quiz.quizId);
                        const refreshed = await getCourseById(courseId, { includeUnpublished: true });
                        setCourses((prev) => prev.map((c) => (c.id === courseId ? refreshed : c)));
                        setNotice("تم حذف الكويز بنجاح!");
                      } catch (err) {
                        setError(err.message || "تعذر حذف الكويز.");
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    className="rounded-xl p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="حذف هذا الكويز"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
