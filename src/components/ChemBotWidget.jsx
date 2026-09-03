import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  BookOpen,
  Atom,
  ChevronDown,
  CornerDownLeft,
  RotateCcw
} from "lucide-react";
import { askChatbot } from "../services/chatService.js";
import { useAuth } from "../context/AuthContext.jsx";

const QUICK_PROMPTS = [
  "ما هي استخدامات عنصر السكانديوم؟",
  "اشرح لي قاعدة ماركونيكوف باختصار",
  "كيفية حساب ثابت الاتزان Kc وتأثير الضغط؟",
  "ما هي العوامل المؤثرة على سرعة التفاعل الكيميائي؟",
  "ما هو الفرق بين الخلية الجلفانية والإلكتروليتية؟"
];

const SUB_MAP = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };

function formatChemText(raw) {
  if (!raw) return "";
  let text = raw;
  // Replace \text{...}, \mathrm{...}, \mathbf{...}, \ce{...}
  text = text.replace(/\\(?:text|mathrm|mathbf|ce|mathit)\{([^}]*)\}/g, "$1");
  // Replace subscript digits like _{12} or _2 with unicode subscripts
  text = text.replace(/_\{(\d+)\}/g, (_, d) => d.split("").map(c => SUB_MAP[c] || c).join(""));
  text = text.replace(/_(\d)/g, (_, d) => SUB_MAP[d] || d);
  // Replace superscript charges like ^{+2} or ^{-}
  text = text.replace(/\^\{([^}]*)\}/g, "($1)");
  text = text.replace(/\^([0-9+-])/g, "($1)");
  // Replace LaTeX arrows and reaction symbols
  text = text.replace(/\\rightarrow/g, "→")
             .replace(/\\longrightarrow/g, "──>")
             .replace(/\\leftrightarrow/g, "⇌")
             .replace(/\\rightleftharpoons/g, "⇌")
             .replace(/\\to/g, "→")
             .replace(/\\times/g, "×")
             .replace(/\\Delta/g, "Δ");
  // Remove $$ and $
  text = text.replace(/\$\$/g, "").replace(/\$/g, "");
  // Clean dangling backslashes
  text = text.replace(/\\[a-zA-Z]+/g, "");
  return text;
}

function ChemMessageContent({ content, isUser }) {
  const cleaned = formatChemText(content);
  if (isUser) {
    return <div className="whitespace-pre-wrap">{cleaned}</div>;
  }

  const lines = cleaned.split("\n");

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Check if the line is a chemical equation
        const isEquation = (trimmed.includes("→") || trimmed.includes("──>") || trimmed.includes("⇌")) &&
                           /[A-Z]/.test(trimmed) &&
                           !trimmed.includes("منصة") && !trimmed.includes("الدكتور");

        if (isEquation) {
          return (
            <div
              key={idx}
              dir="ltr"
              className="my-2 p-2.5 rounded-xl bg-cyan-50/80 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-800 text-[#0077B6] dark:text-cyan-300 font-mono text-center text-xs tracking-wider shadow-inner font-extrabold select-all overflow-x-auto"
            >
              {trimmed}
            </div>
          );
        }

        // Render markdown bold text
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className={trimmed.startsWith("-") || trimmed.startsWith("•") ? "pr-2" : ""}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={pIdx} className="font-black text-slate-900 dark:text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function ChemBotWidget({ courseId = null }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "model",
      content: "أهلاً بك يا بطل! 🧪⚛️\nأنا «المساعد الكيميائي الذكي» لمنصة الدكتور مينا موريد. اسألني أي سؤال في منهج الكيمياء وسأشرحه لك بدقة من واقع المحاضرات!",
      sourceLectures: [],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Pass previous messages excluding initial welcome
      const historyToSend = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6);

      const response = await askChatbot(query, historyToSend, courseId);

      const botMessage = {
        id: `bot_${Date.now()}`,
        role: "model",
        content: response.answer,
        sourceLectures: response.sourceLectures || [],
        createdAt: response.createdAt,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          content: `⚠️ ${err.message || "حدث خطأ أثناء معالجة السؤال الكيميائي."}`,
          sourceLectures: [],
          isError: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome_reset",
        role: "model",
        content: "تم بدء محادثة جديدة! ⚛️ ما هو المفهوم الكيميائي الذي تريد فهمه الآن؟",
        sourceLectures: [],
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 font-['Cairo',_sans-serif]" dir="rtl">
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 30 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsOpen(true)}
            aria-label="المساعد الكيميائي الذكي"
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#0077B6] via-[#00A8E8] to-[#38D9C8] text-white px-5 py-3.5 rounded-full shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all border border-white/20"
          >
            <div className="relative flex items-center justify-center">
              <Atom size={26} className="animate-spin-slow text-white" />
              <Sparkles size={12} className="absolute -top-1 -right-1 text-amber-300 animate-bounce" />
            </div>
            <div className="text-right">
              <span className="text-xs font-black block leading-none">المساعد الكيميائي</span>
              <span className="text-[10px] text-cyan-100 font-bold block mt-0.5">ذكاء اصطناعي من المنهج</span>
            </div>
            <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expandable Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-cyan-100 dark:border-slate-800 flex flex-col overflow-hidden text-right"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white p-4 flex items-center justify-between shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                <Atom size={120} />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-inner">
                  <Atom size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm flex items-center gap-1.5">
                    المساعد الكيميائي الذكي
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-extrabold">RAG AI</span>
                  </h3>
                  <p className="text-[11px] text-cyan-100 font-bold">منصة الدكتور مينا موريد للكيمياء</p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  type="button"
                  onClick={clearChat}
                  title="محادثة جديدة"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm mt-1 ${
                        isUser ? "bg-slate-700" : "bg-[#0077B6]"
                      }`}
                    >
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div
                      className={`max-w-[82%] rounded-2xl p-3.5 text-xs font-bold leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-[#0077B6] text-white rounded-br-none"
                          : msg.isError
                          ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 rounded-bl-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none"
                      }`}
                    >
                      <ChemMessageContent content={msg.content} isUser={isUser} />

                      {/* Source lectures badge */}
                      {!isUser && msg.sourceLectures && msg.sourceLectures.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-400 flex flex-wrap items-center gap-1">
                          <BookOpen size={11} className="text-[#0077B6] dark:text-[#00A8E8]" />
                          <span>مرجع المنهج:</span>
                          {msg.sourceLectures.map((s, idx) => (
                            <span key={idx} className="bg-cyan-50 dark:bg-slate-700 text-[#0077B6] dark:text-cyan-300 px-1.5 py-0.5 rounded font-black">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center text-xs font-bold text-[#0077B6] p-2">
                  <Bot size={16} className="animate-bounce" />
                  <span>جارٍ البحث في محاضرات د. مينا وصياغة الإجابة...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts (Chips) */}
            {messages.length <= 2 && !isLoading && (
              <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 mb-1.5 pr-1">أسئلة كيميائية شائعة:</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="shrink-0 text-[11px] font-bold bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl transition border border-slate-200 dark:border-slate-700 text-right"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  disabled={isLoading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب سؤالك في الكيمياء هنا..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#0077B6] dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white flex items-center justify-center transition hover:shadow-md disabled:opacity-40 active:scale-95 shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
              <p className="text-[9px] text-center text-slate-400 mt-1 font-bold">
                الإجابات مستخرجة من محاضرات المنهج تحت إشراف د. مينا موريد.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
