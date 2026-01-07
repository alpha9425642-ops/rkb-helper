import { useEffect, useMemo, useRef, useState } from "react";
import SegmentTabs from "./components/SegmentTabs.jsx";
import ToastEdgeFlash from "./components/ToastEdgeFlash.jsx";
import { MALE_FIRST, FEMALE_FIRST, LAST_NAMES } from "./data/names.js";
import { copyWithFlash } from "./lib/copyFlash.js";
import { extractOtp } from "./lib/otpExtract.js";
import { parseTotpConfig, totpGenerate } from "./lib/totp";

const GenderMode = {
  MIX: "mix",
  MALE: "male",
  FEMALE: "female",
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeName(genderMode) {
  const first =
    genderMode === GenderMode.MALE
      ? pick(MALE_FIRST)
      : genderMode === GenderMode.FEMALE
      ? pick(FEMALE_FIRST)
      : pick(Math.random() < 0.5 ? MALE_FIRST : FEMALE_FIRST);

  return `${first} ${pick(LAST_NAMES)}`;
}

function Icon({ kind }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (kind === "refresh")
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    );
  if (kind === "trash")
    return (
      <svg {...common}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    );
  if (kind === "male")
    return (
      <svg {...common}>
        <circle cx="10" cy="14" r="6" />
        <path d="M14 10l7-7" />
        <path d="M15 3h6v6" />
      </svg>
    );
  if (kind === "female")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="6" />
        <path d="M12 14v8" />
        <path d="M8 18h8" />
      </svg>
    );
  if (kind === "mix")
    return (
      <svg {...common}>
        <circle cx="9" cy="14" r="6" />
        <circle cx="16" cy="9" r="4" />
      </svg>
    );
  if (kind === "gear")
    return (
      <svg {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 5.6h-4L10.4 8a7.6 7.6 0 0 0-1.7 1L6.4 8.4l-2 3.4L6.4 13a7.8 7.8 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1l.6 2.4h4l.6-2.4a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z" />
      </svg>
    );
  return null;
}

export default function App() {
  // top: name generator
  const [gender, setGender] = useState(GenderMode.MIX);
  const [name, setName] = useState(() => makeName(GenderMode.MIX));
  const [spinName, setSpinName] = useState(false);

  // temp mail
  const [mailTab, setMailTab] = useState("mailcx");
  const [spinMail, setSpinMail] = useState(false);
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState([]);
  const [otpFromMail, setOtpFromMail] = useState(null);
  const [mailStatus, setMailStatus] = useState("");

  // 2FA
  const [secret, setSecret] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [totpLeft, setTotpLeft] = useState(30);
  const [isTotpValid, setIsTotpValid] = useState(false);

  // copy flash
  const [flashKey, setFlashKey] = useState(null);

  function triggerSpin(setter) {
    setter(true);
    setTimeout(() => setter(false), 380);
  }

  async function refreshName() {
    triggerSpin(setSpinName);
    setName(makeName(gender));
  }

  async function copyName() {
    await copyWithFlash(name, "name", setFlashKey);
  }

  // TEMPMAIL+ helpers
  async function tmPlusNew() {
    setMailStatus("Creating mailbox…");
    try {
      const res = await fetch("/.netlify/functions/tempmailplus_new");
      const j = await res.json();
      if (j?.email) {
        setEmail(j.email);
        setMailStatus("");
        setEmails([]);
        setOtpFromMail(null);
      } else {
        setMailStatus(j?.error || "Failed to create mailbox");
      }
    } catch (e) {
      setMailStatus("Failed to create mailbox");
    }
  }

  async function tmPlusRefresh() {
    if (!email) return;
    triggerSpin(setSpinMail);
    setMailStatus("Refreshing…");
    try {
      const res = await fetch(
        `/.netlify/functions/tempmailplus_inbox?email=${encodeURIComponent(email)}`
      );
      const j = await res.json();

      if (j?.items) {
        setEmails(j.items);

        const joined = j.items.map((x) => `${x.subject || ""}\n${x.text || ""}`).join("\n\n");
        const otp = extractOtp(joined);
        setOtpFromMail(otp || null);
        setMailStatus("");
      } else {
        setMailStatus(j?.error || "Failed to refresh inbox");
      }
    } catch (e) {
      setMailStatus("Failed to refresh inbox");
    }
  }

  async function mailCxInfo() {
    setMailStatus("Loading…");
    try {
      const res = await fetch("/.netlify/functions/mailcx_stub");
      const j = await res.json();
      setMailStatus(j?.message || "Mail.cx adapter missing");
    } catch {
      setMailStatus("Mail.cx adapter missing");
    }
    setEmails([]);
    setOtpFromMail(null);
    setEmail("");
  }

  async function mailDelete() {
    if (mailTab === "tempmail") return tmPlusNew();
    return mailCxInfo();
  }

  async function mailRefresh() {
    if (mailTab === "tempmail") return tmPlusRefresh();
    return mailCxInfo();
  }

  // init mailbox when switching tab
  useEffect(() => {
    if (mailTab === "tempmail") {
      if (!email) tmPlusNew();
    } else {
      mailCxInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailTab]);

  async function copyEmail() {
    if (!email) return;
    await copyWithFlash(email, "email", setFlashKey);
  }

  async function copyOtpFromMail() {
    if (!otpFromMail) return;
    await copyWithFlash(otpFromMail, "mailOtp", setFlashKey);
  }

  // 2FA loop
  const totpRef = useRef(null);

  useEffect(() => {
    const cfg = parseTotpConfig(secret);
    totpRef.current = cfg;

    setIsTotpValid(!!cfg);
    setTotpToken("");
    setTotpLeft(30);
  }, [secret]);

  useEffect(() => {
    const id = setInterval(async () => {
      const cfg = totpRef.current;
      if (!cfg) return;

      const now = await totpGenerate(cfg);
      if (!now) {
        setIsTotpValid(false);
        setTotpToken("");
        setTotpLeft(30);
        return;
      }

      setIsTotpValid(true);
      setTotpToken(now.token);
      setTotpLeft(now.left);
    }, 500);

    return () => clearInterval(id);
  }, []);

  async function pasteSecret() {
    try {
      const t = await navigator.clipboard.readText();
      setSecret(t.trim());
    } catch {}
  }

  function removeSecret() {
    setSecret("");
  }

  async function copyTotp() {
    if (!totpToken) return;
    await copyWithFlash(totpToken, "totp", setFlashKey);
  }

  function cycleGender() {
    setGender((g) =>
      g === GenderMode.MIX ? GenderMode.MALE : g === GenderMode.MALE ? GenderMode.FEMALE : GenderMode.MIX
    );
  }

  const genderIcon =
    gender === GenderMode.MALE ? "male" : gender === GenderMode.FEMALE ? "female" : "mix";

  const topMail = emails?.[0] || null;
  const mailSubject = topMail?.subject || "";
  const mailFrom = topMail?.from || topMail?.sender || "";

  return (
    <div style={{ height: "100dvh", padding: 12, display: "grid", gridTemplateRows: "48px 1fr", gap: 10 }}>
      {/* Header */}
      <div className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon kind="gear" />
          <div style={{ fontWeight: 900 }}>RKB Helper</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>v1</div>
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 10, minHeight: 0 }}>
        {/* 1) Random name */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>Random Name</div>
            <div className="muted" style={{ fontSize: 12 }}>Tap value to copy</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 10, alignItems: "center" }}>
            <div className="btn" onClick={cycleGender} title="Gender">
              <Icon kind={genderIcon} />
            </div>

            <ToastEdgeFlash flashKey={flashKey} myKey="name">
              <div className="pill" onClick={copyName} style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="bigValue">{name}</div>
              </div>
            </ToastEdgeFlash>

            <div className="btn" onClick={refreshName} title="Refresh name">
              <div className={spinName ? "spin360" : ""}>
                <Icon kind="refresh" />
              </div>
            </div>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Mode: <span className="kbd">{gender === "mix" ? "Male+Female" : gender}</span>
          </div>
        </div>

        {/* 2) Temp mail */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>Temp Mail</div>
            <div className="muted" style={{ fontSize: 12 }}>Click email / OTP to copy</div>
          </div>

          <SegmentTabs
            items={[
              { label: "Mail.cx", value: "mailcx" },
              { label: "Tempmail+", value: "tempmail" },
            ]}
            value={mailTab}
            onChange={setMailTab}
          />

          {/* IMPORTANT: This wrapper ensures buttons never overlap inbox on mobile */}
          <div style={{ minHeight: 0, display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", gap: 8 }}>
            {/* Email */}
            <ToastEdgeFlash flashKey={flashKey} myKey="email">
              <div
                className="pill"
                onClick={copyEmail}
                style={{ padding: 12, minHeight: 46, display: "flex", alignItems: "center" }}
              >
                <div className="bigValue" style={{ fontSize: 16, wordBreak: "break-all" }}>
                  {email || (mailTab === "mailcx" ? "Mail.cx (adapter needed)" : "Creating…")}
                </div>
              </div>
            </ToastEdgeFlash>

            {/* Inbox / OTP */}
            <ToastEdgeFlash flashKey={flashKey} myKey="mailOtp">
              <div
                className="pill"
                onClick={copyOtpFromMail}
                style={{
                  minHeight: 0,
                  padding: 12,
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                {mailStatus ? (
                  <div className="muted" style={{ fontSize: 13 }}>{mailStatus}</div>
                ) : otpFromMail ? (
                  <div style={{ width: "100%" }}>
                    <div
                      className="muted"
                      style={{
                        fontSize: 12,
                        marginBottom: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {mailFrom ? `${mailFrom} — ${mailSubject}` : (mailSubject || "OTP")}
                    </div>
                    <div className="muted" style={{ fontSize: 11, letterSpacing: 1, marginBottom: 2 }}>OTP</div>
                    <div className="bigValue" style={{ fontSize: 30 }}>{otpFromMail}</div>
                  </div>
                ) : (
                  <div className="muted">Inbox empty</div>
                )}
              </div>
            </ToastEdgeFlash>

            {/* Buttons (always visible, always below inbox) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn danger" onClick={mailDelete} type="button">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon kind="trash" /> Delete
                </span>
              </button>

              <button className="btn" onClick={mailRefresh} type="button">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className={spinMail ? "spin360" : ""}><Icon kind="refresh" /></span>
                  Refresh
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3) 2FA */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>2FA</div>
            <div className="muted" style={{ fontSize: 12 }}>Google Authenticator style</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 10, alignItems: "center" }}>
            <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Input 2fa secret" />
            {!secret ? (
              <div className="btn btnGreen" onClick={pasteSecret}>Paste</div>
            ) : (
              <div className="btn btnRed" onClick={removeSecret}>Remove</div>
            )}
          </div>

          <ToastEdgeFlash flashKey={flashKey} myKey="totp">
            <div className="pill" onClick={copyTotp} style={{ height: "100%", display: "grid", placeItems: "center" }}>
              {secret && !isTotpValid ? (
                <div className="muted">Invalid secret (needs Base32 or otpauth://)</div>
              ) : totpToken ? (
                <div style={{ textAlign: "center" }}>
                  <div className="bigValue" style={{ fontSize: 28 }}>{totpToken}</div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    Refresh in <span className="kbd">{totpLeft}s</span>
                  </div>
                </div>
              ) : (
                <div className="muted">Paste or type a secret to see OTP</div>
              )}
            </div>
          </ToastEdgeFlash>
        </div>
      </div>
    </div>
  );
}
