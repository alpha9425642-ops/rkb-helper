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
  FEMALE: "female"
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeName(genderMode) {
  const first =
    genderMode === GenderMode.MALE ? pick(MALE_FIRST)
    : genderMode === GenderMode.FEMALE ? pick(FEMALE_FIRST)
    : pick(Math.random() < 0.5 ? MALE_FIRST : FEMALE_FIRST);

  return `${first} ${pick(LAST_NAMES)}`;
}

function Icon({ kind }) {
  // tiny inline icons (no dependencies)
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "refresh") return (
    <svg {...common}><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
  );
  if (kind === "trash") return (
    <svg {...common}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
  );
  if (kind === "male") return (
    <svg {...common}><circle cx="10" cy="14" r="6"/><path d="M14 10l7-7"/><path d="M15 3h6v6"/></svg>
  );
  if (kind === "female") return (
    <svg {...common}><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/><path d="M8 18h8"/></svg>
  );
  if (kind === "mix") return (
    <svg {...common}><circle cx="9" cy="14" r="6"/><circle cx="16" cy="9" r="4"/></svg>
  );
  if (kind === "gear") return (
    <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 5.6h-4L10.4 8a7.6 7.6 0 0 0-1.7 1L6.4 8.4l-2 3.4L6.4 13a7.8 7.8 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1l.6 2.4h4l.6-2.4a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z"/></svg>
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

  // layout: fixed height
  const vh = useMemo(() => window.innerHeight, []);
  const appPad = 12;

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
  }

  async function tmPlusRefresh() {
    if (!email) return;
    triggerSpin(setSpinMail);
    setMailStatus("Refreshing…");
    const res = await fetch(`/.netlify/functions/tempmailplus_inbox?email=${encodeURIComponent(email)}`);
    const j = await res.json();

    if (j?.items) {
      setEmails(j.items);
      // Extract OTP from any subjects/text
      const joined = j.items.map(x => `${x.subject}\n${x.text}`).join("\n\n");
      const otp = extractOtp(joined);
      setOtpFromMail(otp);
      setMailStatus("");
    } else {
      setMailStatus(j?.error || "Failed to refresh inbox");
    }
  }

  async function mailCxInfo() {
    setMailStatus("Loading…");
    const res = await fetch("/.netlify/functions/mailcx_stub");
    const j = await res.json();
    setMailStatus(j?.message || "Mail.cx adapter missing");
    setEmails([]);
    setOtpFromMail(null);
    setEmail("");
  }

  async function mailDelete() {
    if (mailTab === "tempmail") {
      await tmPlusNew();
    } else {
      await mailCxInfo();
    }
  }

  async function mailRefresh() {
    if (mailTab === "tempmail") {
      await tmPlusRefresh();
    } else {
      await mailCxInfo();
    }
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

// when secret changes: parse config + set validity
useEffect(() => {
  const cfg = parseTotpConfig(secret);
  totpRef.current = cfg;

  setIsTotpValid(!!cfg);
  setTotpToken("");
  setTotpLeft(30);
}, [secret]);

// ticker: generate OTP every 500ms (async)
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

  // Gender icon cycles: mix -> male -> female -> mix
  function cycleGender() {
    setGender(g =>
      g === GenderMode.MIX ? GenderMode.MALE :
      g === GenderMode.MALE ? GenderMode.FEMALE :
      GenderMode.MIX
    );
  }

  const genderIcon = gender === GenderMode.MALE ? "male" : gender === GenderMode.FEMALE ? "female" : "mix";

  // --- UI (no scroll)
  return (
    <div style={{ height: vh, padding: appPad, display: "grid", gridTemplateRows: "48px 1fr", gap: 10 }}>
      {/* Header */}
      <div className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon kind="gear" />
          <div style={{ fontWeight: 900 }}>RKB Helper</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>v1</div>
      </div>

      {/* Body: 3 sections */}
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 10, minHeight: 0 }}>
        {/* 1) Random name */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto 1fr", gap: 10, minHeight: 0 }}>
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
              <div className={spinName ? "spin360" : ""}><Icon kind="refresh" /></div>
            </div>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Mode: <span className="kbd">{gender === "mix" ? "Male+Female" : gender}</span>
          </div>
        </div>

        {/* 2) Temp mail */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>Temp Mail</div>
            <div className="muted" style={{ fontSize: 12 }}>Click email / OTP to copy</div>
          </div>

          <SegmentTabs
            items={[
              { label: "Mail.cx", value: "mailcx" },
              { label: "Tempmail+", value: "tempmail" }
            ]}
            value={mailTab}
            onChange={setMailTab}
          />

          <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 8, minHeight: 0 }}>
            <ToastEdgeFlash flashKey={flashKey} myKey="email">
              <div className="pill" onClick={copyEmail} style={{ padding: 12, minHeight: 46, display: "flex", alignItems: "center" }}>
                <div className="bigValue" style={{ fontSize: 16, wordBreak: "break-all" }}>
                  {email || (mailTab === "mailcx" ? "Mail.cx (adapter needed)" : "Creating…")}
                </div>
              </div>
            </ToastEdgeFlash>

            {/* Inbox preview */}
            <div className="pill" style={{ minHeight: 56, overflow: "hidden" }}>
              {mailStatus ? (
                <div className="muted" style={{ fontSize: 13 }}>{mailStatus}</div>
              ) : emails.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {emails.slice(0, 2).map((m, idx) => (
                    <div key={idx} className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.from ? `${m.from} — ` : ""}{m.subject || "(no subject)"}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>Inbox empty</div>
              )}
            </div>
          </div>

          {/* Buttons + OTP */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="btn" onClick={mailDelete}>
              <Icon kind="trash" />
              <span>Delete</span>
            </div>

            <div className="btn" onClick={mailRefresh}>
              <div className={spinMail ? "spin360" : ""}><Icon kind="refresh" /></div>
              <span>Refresh</span>
            </div>
          </div>

          {otpFromMail ? (
            <ToastEdgeFlash flashKey={flashKey} myKey="mailOtp">
              <div className="pill" onClick={copyOtpFromMail} style={{ marginTop: 8, textAlign: "center" }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>OTP</div>
                <div className="bigValue">{otpFromMail}</div>
              </div>
            </ToastEdgeFlash>
          ) : null}
        </div>

        {/* 3) 2FA */}
        <div className="card" style={{ padding: 12, display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>2FA</div>
            <div className="muted" style={{ fontSize: 12 }}>Google Authenticator style</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 10, alignItems: "center" }}>
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Input 2fa secret"
            />
            {!secret ? (
              <div className="btn btnGreen" onClick={pasteSecret}>Paste</div>
            ) : (
              <div className="btn btnRed" onClick={removeSecret}>Remove</div>
            )}
          </div>

<ToastEdgeFlash flashKey={flashKey} myKey="totp">
  <div
    className="pill"
    onClick={copyTotp}
    style={{ height: "100%", display: "grid", placeItems: "center" }}
  >
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
