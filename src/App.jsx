import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

const QUESTIONS = [
  {
    id: "pain_point",
    q: "What's eating most of your time right now?",
    opts: [
      { id: "invoices", label: "Chasing invoices & payments" },
      { id: "clients",  label: "Finding & pitching new clients" },
      { id: "comms",    label: "Managing client comms" },
      { id: "admin",    label: "Scheduling & admin" },
    ],
  },
  {
    id: "current_stack",
    q: "How are you running your business today?",
    opts: [
      { id: "sheets",   label: "Spreadsheets and emails" },
      { id: "apps",     label: "A mix of random apps" },
      { id: "one_tool", label: "One main tool (Notion, Trello etc)" },
      { id: "head",     label: "Mostly in my head" },
    ],
  },
  {
    id: "location",
    q: "Where are you building from?",
    opts: [
      { id: "base",     label: "One home base" },
      { id: "cities",   label: "A few cities" },
      { id: "moving",   label: "Always moving" },
      { id: "aspiring", label: "Aspiring to roam" },
    ],
  },
];

const fmt = (n) => String(n).padStart(3, "0");

export default function App() {
  const [step, setStep]             = useState(0);
  const [email, setEmail]           = useState("");
  const [focused, setFocused]       = useState(false);
  const [answers, setAnswers]       = useState({});
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [count, setCount]           = useState(0);
  const [myPosition, setMyPosition] = useState(null);
  const canvasRef = useRef(null);

  // ── Favicon — injected via canvas so Barlow Condensed renders correctly ──
  useEffect(() => {
    // Wait for Barlow Condensed to load then draw favicon on canvas
    const setFavicon = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Background — rounded rect
      const r = 12;
      ctx.fillStyle = "#080808";
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.quadraticCurveTo(size, 0, size, r);
      ctx.lineTo(size, size - r);
      ctx.quadraticCurveTo(size, size, size - r, size);
      ctx.lineTo(r, size);
      ctx.quadraticCurveTo(0, size, 0, size - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      // NMD text — centered
      ctx.fillStyle = "#CCFF00";
      ctx.font = "900 26px 'Barlow Condensed', 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "-1px";
      ctx.fillText("NMD", size / 2, size / 2 + 1);

      // Set as favicon
      const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = canvas.toDataURL("image/png");
      document.head.appendChild(link);
    };

    // Use FontFaceObserver pattern — poll until font is ready
    if (document.fonts) {
      document.fonts.load("900 16px 'Barlow Condensed'").then(setFavicon).catch(setFavicon);
    } else {
      setTimeout(setFavicon, 800);
    }
  }, []);

  // ── Film grain ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let id;
    const tick = () => {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(c.width, c.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 7;
      }
      ctx.putImageData(img, 0, 0);
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Live count ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true });
      setCount(c || 0);
    };
    fetchCount();
  }, []);

  // ── Submit email ────────────────────────────────────────────────────────────
  const submitEmail = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase
      .from("waitlist")
      .insert([{ email: email.trim().toLowerCase() }]);
    setLoading(false);
    if (err) {
      if (err.code === "23505") {
        const { count: c } = await supabase
          .from("waitlist")
          .select("*", { count: "exact", head: true });
        setMyPosition(c || count);
        setStep(1);
        setSelected(null);
        return;
      }
      setError("Something went wrong. Try again.");
      return;
    }
    const newCount = count + 1;
    setCount(newCount);
    setMyPosition(newCount);
    setStep(1);
    setSelected(null);
  };

  // ── Submit quiz answer ──────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!selected) return;
    const qId = QUESTIONS[step - 1].id;
    const newAnswers = { ...answers, [qId]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    if (step === 3) {
      await supabase
        .from("waitlist")
        .update(newAnswers)
        .eq("email", email.trim().toLowerCase());
      setStep(4);
    } else {
      setStep(s => s + 1);
    }
  };

  const currentQ = step >= 1 && step <= 3 ? QUESTIONS[step - 1] : null;
  const progress  = step === 0 ? 0 : step === 4 ? 100 : (step / 4) * 100;

  return (
    <div style={{
      background: "#080808",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080808; -webkit-font-smoothing: antialiased; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.3); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes checkPop {
          from { opacity: 0; transform: scale(0.5) rotate(-15deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes blobA {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          33%  { transform: translate(22px, -28px)  scale(1.05); }
          66%  { transform: translate(-14px, 18px)  scale(0.96); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
        @keyframes blobB {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          33%  { transform: translate(-24px, 20px)  scale(1.06); }
          66%  { transform: translate(16px, -22px)  scale(0.95); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
        @keyframes blobC {
          0%   { transform: translate(0px,  0px); }
          50%  { transform: translate(12px, -16px); }
          100% { transform: translate(0px,  0px); }
        }

        .u1 { animation: fadeUp 0.65s ease 0.00s both; }
        .u2 { animation: fadeUp 0.65s ease 0.10s both; }
        .u3 { animation: fadeUp 0.65s ease 0.20s both; }
        .u4 { animation: fadeUp 0.65s ease 0.30s both; }
        .u5 { animation: fadeUp 0.65s ease 0.40s both; }
        .step-enter { animation: fadeUp 0.35s ease both; }
        .pop        { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .check-pop  { animation: checkPop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .blob-a     { animation: blobA 20s ease-in-out infinite; }
        .blob-b     { animation: blobB 25s ease-in-out infinite; }
        .blob-c     { animation: blobC 15s ease-in-out infinite; }

        .submit-btn { transition: all 0.18s ease; cursor: pointer; }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(204,255,0,0.28) !important;
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.3; cursor: default; }

        .opt-btn { transition: all 0.15s ease; cursor: pointer; }
        .opt-btn:active { transform: scale(0.985); }

        input::placeholder { color: rgba(204,255,0,0.28); }
        input:focus { outline: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* Grain */}
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 10,
        mixBlendMode: "overlay",
      }} />

      {/* Lime blobs */}
      <div className="blob-a" style={{
        position: "fixed", top: "-20%", left: "-15%",
        width: "60vw", height: "60vw",
        maxWidth: 480, maxHeight: 480,
        background: "radial-gradient(circle at 40% 40%, rgba(204,255,0,0.17) 0%, rgba(204,255,0,0.04) 50%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none", zIndex: 0,
        filter: "blur(2px)",
      }} />
      <div className="blob-b" style={{
        position: "fixed", bottom: "-15%", right: "-20%",
        width: "65vw", height: "65vw",
        maxWidth: 520, maxHeight: 520,
        background: "radial-gradient(circle at 60% 60%, rgba(204,255,0,0.11) 0%, rgba(204,255,0,0.03) 55%, transparent 72%)",
        borderRadius: "50%",
        pointerEvents: "none", zIndex: 0,
        filter: "blur(2px)",
      }} />
      <div className="blob-c" style={{
        position: "fixed", top: "38%", left: "58%",
        width: "28vw", height: "28vw",
        maxWidth: 200, maxHeight: 200,
        background: "radial-gradient(circle, rgba(204,255,0,0.05) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Grid */}
      <div style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(204,255,0,0.016) 1px, transparent 1px),
          linear-gradient(90deg, rgba(204,255,0,0.016) 1px, transparent 1px)
        `,
        backgroundSize: "44px 44px",
      }} />

      {/* Progress bar */}
      {step > 0 && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: 2, background: "rgba(204,255,0,0.07)", zIndex: 30,
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #AADD00, #CCFF00)",
            transition: "width 0.45s ease",
            borderRadius: "0 2px 2px 0",
            boxShadow: "0 0 8px rgba(204,255,0,0.45)",
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 20, width: "100%", maxWidth: 400 }}>

        {/* STEP 0 — Email */}
        {step === 0 && (
          <div>
            <div className="u1" style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 16px",
                background: "rgba(204,255,0,0.06)",
                border: "1px solid rgba(204,255,0,0.14)",
                borderRadius: 100,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#CCFF00",
                  animation: "pulse 2.2s ease infinite",
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed'",
                  fontSize: 11, color: "#CCFF00",
                  letterSpacing: "0.18em", textTransform: "uppercase",
                }}>
                  {count === 0 ? "Be the first" : `${fmt(count)} on the waitlist`}
                </span>
              </div>
            </div>

            <div className="u2" style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                fontFamily: "'Barlow Condensed'",
                fontSize: "clamp(72px, 20vw, 96px)",
                fontWeight: 900,
                color: "#CCFF00",
                letterSpacing: "-3px",
                lineHeight: 0.88,
                textTransform: "uppercase",
              }}>
                NOMAAD
              </div>
            </div>

            <div className="u3" style={{ textAlign: "center", marginBottom: 36 }}>
              <p style={{
                fontFamily: "'DM Sans'",
                fontSize: "clamp(15px, 4vw, 18px)",
                color: "rgba(242,242,238,0.6)",
                lineHeight: 1.55,
                fontWeight: 300,
              }}>
                The business tool built for people<br />
                who hate business tools.
              </p>
            </div>

            <div className="u4" style={{ marginBottom: error ? 10 : 22 }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${focused ? "rgba(204,255,0,0.8)" : "rgba(204,255,0,0.3)"}`,
                borderRadius: 14,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                padding: "5px 5px 5px 18px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: focused
                  ? "0 0 0 3px rgba(204,255,0,0.08), 0 16px 48px rgba(0,0,0,0.45)"
                  : "0 12px 40px rgba(0,0,0,0.3)",
              }}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={e => e.key === "Enter" && !loading && submitEmail()}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "#F2F2EE",
                    fontFamily: "'DM Sans'",
                    fontSize: 16,
                    fontWeight: 400,
                    padding: "12px 0",
                    minWidth: 0,
                  }}
                />
                <button
                  className="submit-btn"
                  onClick={submitEmail}
                  disabled={loading || !email.includes("@")}
                  style={{
                    padding: "13px 18px",
                    background: "#CCFF00",
                    border: "none",
                    borderRadius: 10,
                    color: "#080808",
                    fontFamily: "'Barlow Condensed'",
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    flexShrink: 0,
                    lineHeight: 1,
                    minWidth: 106,
                    boxShadow: "0 0 20px rgba(204,255,0,0.25)",
                    isolation: "isolate",
                  }}
                >
                  {loading ? "..." : "Join waitlist"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "#ff6b6b" }}>
                  {error}
                </span>
              </div>
            )}

            <div className="u5" style={{
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10,
            }}>
              <div style={{ display: "flex" }}>
                {["#8B6F5E","#5E7B6F","#6F5E8B","#7B6F5E"].map((col, i) => (
                  <div key={i} style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: col,
                    border: "2px solid #080808",
                    marginLeft: i > 0 ? -7 : 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: 8, color: "rgba(255,255,255,0.8)",
                      fontFamily: "'Barlow Condensed'", fontWeight: 700,
                    }}>
                      {["L","K","J","M"][i]}
                    </span>
                  </div>
                ))}
              </div>
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 11,
                color: "rgba(242,242,238,0.2)", fontWeight: 300,
              }}>
                Filmmakers &amp; solo creatives waiting
              </span>
            </div>
          </div>
        )}

        {/* STEPS 1-3 — Quiz */}
        {currentQ && (
          <div className="step-enter" key={`q-${step}`}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <span style={{
                fontFamily: "'Barlow Condensed'",
                fontSize: 9, color: "rgba(204,255,0,0.3)",
                letterSpacing: "0.22em", textTransform: "uppercase",
              }}>
                {step} of 3
              </span>
            </div>

            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <p style={{
                fontFamily: "'Barlow Condensed'",
                fontSize: "clamp(20px, 5.5vw, 26px)",
                fontWeight: 700,
                color: "#F2F2EE",
                lineHeight: 1.2,
                letterSpacing: "-0.2px",
              }}>
                {currentQ.q}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {currentQ.opts.map((opt, i) => {
                const isSel = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    className="opt-btn"
                    onClick={() => setSelected(opt.id)}
                    style={{
                      padding: "16px 18px",
                      background: isSel ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isSel ? "rgba(204,255,0,0.46)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 12,
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      textAlign: "left",
                      width: "100%",
                      animation: `fadeUp 0.35s ease ${i * 0.06}s both`,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18,
                      borderRadius: "50%",
                      border: `1.5px solid ${isSel ? "#CCFF00" : "rgba(255,255,255,0.18)"}`,
                      background: isSel ? "#CCFF00" : "transparent",
                      flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {isSel && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#080808" }} />
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'DM Sans'",
                      fontSize: 15,
                      color: isSel ? "#F2F2EE" : "rgba(242,242,238,0.46)",
                      fontWeight: isSel ? 400 : 300,
                      lineHeight: 1.3,
                      transition: "color 0.15s",
                    }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="submit-btn"
              onClick={submitAnswer}
              disabled={!selected}
              style={{
                width: "100%",
                padding: "15px",
                background: "#CCFF00",
                border: "none",
                borderRadius: 12,
                color: "#080808",
                fontFamily: "'Barlow Condensed'",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                lineHeight: 1,
                boxShadow: "0 8px 28px rgba(204,255,0,0.14)",
              }}
            >
              {step === 3 ? "Done" : "Continue"}
            </button>
          </div>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && (
          <div className="pop" style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
          }}>
            <div className="check-pop" style={{
              width: 72, height: 72,
              background: "#CCFF00",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 28,
              boxShadow: "0 0 60px rgba(204,255,0,0.26)",
            }}>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path
                  d="M6 15l6 6 12-12"
                  stroke="#080808"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div style={{
              fontFamily: "'Barlow Condensed'",
              fontSize: 52,
              fontWeight: 900,
              color: "#CCFF00",
              letterSpacing: "-1.5px",
              lineHeight: 0.88,
              marginBottom: 16,
              textTransform: "uppercase",
            }}>
              You&apos;re in.
            </div>

            <p style={{
              fontFamily: "'DM Sans'",
              fontSize: 15,
              color: "rgba(242,242,238,0.36)",
              lineHeight: 1.65,
              fontWeight: 300,
              maxWidth: 260,
              marginBottom: 48,
            }}>
              #{fmt(myPosition || count)} on the list.<br />
              We&apos;ll keep you in the loop.
            </p>

            <div style={{
              fontFamily: "'Barlow Condensed'",
              fontSize: 20, fontWeight: 900,
              color: "rgba(204,255,0,0.13)",
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}>
              NOMAAD
            </div>
          </div>
        )}
      </div>

      {/* Domain footer */}
      {step === 0 && (
        <div style={{
          position: "fixed", bottom: 20,
          left: 0, right: 0,
          textAlign: "center", zIndex: 20,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed'",
            fontSize: 9,
            color: "rgba(204,255,0,0.13)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}>
            nomaad.ai
          </span>
        </div>
      )}
    </div>
  );
}
