"use client";

import { useRouter } from "next/navigation";

interface PassMember {
  id: string;
  fullName: string;
  relationToHead: string;
}

interface PassData {
  fullName: string;
  fatherName: string;
  gotra: string;
  householdCode: string;
  nativePlace: string;
  currentCity: string;
  roleLabel: string;
  memberSince: number;
  photoUrl: string;
  qrSvg: string;
  profileUrl: string;
  allMembers: PassMember[] | null;
  currentMemberId: string;
}

export default function LanyardPassClient({ passData }: { passData: PassData }) {
  const router = useRouter();
  const {
    fullName, fatherName, gotra, householdCode, nativePlace,
    currentCity, roleLabel, memberSince, photoUrl, qrSvg,
    allMembers, currentMemberId,
  } = passData;

  return (
    <div className="min-h-screen bg-[#0d111a] flex flex-col">
      {/* Top bar — hidden on print */}
      <div className="no-print sticky top-0 z-50 bg-[#151a26] border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-white font-bold text-sm">Member Identity Pass</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Member switcher — only for head */}
          {allMembers && allMembers.length > 1 && (
            <select
              className="bg-[#222a3a] border border-white/15 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none"
              value={currentMemberId}
              onChange={(e) =>
                router.push(`/dashboard/pass?memberId=${e.target.value}`)
              }
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.relationToHead})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Stage */}
      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4 bg-[radial-gradient(circle_at_center_top,#192233_0%,#090c12_85%)]">
        {/* Lanyard rig */}
        <div className="flex flex-col items-center">
          {/* Strap */}
          <div
            className="w-[52px] h-[100px] flex items-center justify-center rounded-t-sm overflow-hidden"
            style={{
              background:
                "repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 1px,transparent 0,transparent 4px), linear-gradient(to right,#701a75,#9f1239 35%,#b45309 65%,#701a75)",
              boxShadow: "0 4px 16px rgba(0,0,0,.6)",
            }}
          >
            <span
              className="text-[9px] font-extrabold tracking-[2px] text-yellow-200 uppercase whitespace-nowrap opacity-95"
              style={{ writingMode: "vertical-rl" }}
            >
              MAHARAJA AGRASEN FOUNDATION LIMITED SINGAPORE
            </span>
          </div>

          {/* Metal hardware */}
          <div className="flex flex-col items-center">
            <div className="w-[52px] h-[12px] rounded-sm" style={{ background: "linear-gradient(to right,#6b7280,#e5e7eb 50%,#4b5563)", boxShadow: "0 2px 5px rgba(0,0,0,.5)" }} />
            <div className="w-[22px] h-[14px] mt-[-2px]" style={{ border: "3.5px solid #9ca3af", borderRadius: "50% 50% 0 0", background: "transparent" }} />
            <div className="w-[12px] h-[24px] rounded" style={{ background: "linear-gradient(135deg,#e5e7eb,#9ca3af 60%,#4b5563)", boxShadow: "0 4px 8px rgba(0,0,0,.4)" }} />
          </div>

          {/* ── CARD ── */}
          <div
            id="lanyard-card"
            className="w-[340px] rounded-2xl overflow-hidden mt-[-6px]"
            style={{
              background: "#ffffff",
              color: "#1f2937",
              boxShadow: "0 24px 48px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.1)",
            }}
          >
            {/* Punch hole */}
            <div
              className="mx-auto mt-2 w-[24px] h-[6px] rounded"
              style={{ background: "#0d111a", boxShadow: "inset 0 2px 4px rgba(0,0,0,.8)" }}
            />

            {/* Card Header */}
            <div
              className="px-4 pb-4 pt-5 text-center"
              style={{ background: "linear-gradient(135deg,#7c2d12 0%,#b45309 50%,#d97706 100%)" }}
            >
              <p className="text-[9px] font-extrabold tracking-[1.2px] uppercase text-yellow-200 mb-0.5">
                Official Member Identity Pass
              </p>
              <p className="font-serif text-[13px] font-extrabold text-white leading-snug" style={{ fontFamily: "Georgia, serif" }}>
                Maharaja Agrasen Foundation Limited Singapore
              </p>
              <p className="text-[10px] text-yellow-100 mt-0.5 font-medium">
                महाराजा अग्रसेन फाउंडेशन लिमिटेड सिंगापुर
              </p>
            </div>

            {/* Card Body */}
            <div
              className="px-4 pb-4 flex flex-col items-center gap-2"
              style={{
                background: "#fafaf9",
                backgroundImage: "radial-gradient(#e7e5e4 1px, transparent 1px)",
                backgroundSize: "12px 12px",
              }}
            >
              {/* Member identity row */}
              <div
                className="w-full flex items-center gap-3 mt-[-20px] bg-white border border-stone-200 rounded-xl p-3"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
              >
                <div className="relative shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={fullName}
                      className="w-[68px] h-[68px] rounded-full object-cover border-[3px] border-white"
                      style={{ boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}
                    />
                  ) : (
                    <div
                      className="w-[68px] h-[68px] rounded-full border-[3px] border-white flex items-center justify-center text-2xl font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg,#b45309,#d97706)",
                        boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                      }}
                    >
                      {fullName.charAt(0)}
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: "#16a34a" }}
                  >
                    ✓
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-extrabold text-[15px] text-stone-900 leading-tight truncate"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {fullName}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-0.5"
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                  >
                    ★ {roleLabel}
                  </span>
                  <p className="text-[11px] font-bold mt-1" style={{ color: "#b45309" }}>
                    Gotra: {gotra}
                  </p>
                </div>
              </div>

              {/* Meta grid */}
              <div
                className="w-full grid grid-cols-2 gap-x-3 gap-y-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,.03)" }}
              >
                {fatherName && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Father (पिता)</span>
                    <span className="text-[11px] font-bold text-stone-800 truncate">{fatherName}</span>
                  </div>
                )}
                {nativePlace && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Ancestral Origin</span>
                    <span className="text-[11px] font-bold text-stone-800 truncate">{nativePlace}</span>
                  </div>
                )}
                {currentCity && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Current Location</span>
                    <span className="text-[11px] font-bold text-stone-800 truncate">{currentCity}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Member Since</span>
                  <span className="text-[11px] font-bold text-stone-800">{memberSince}</span>
                </div>
              </div>

              {/* QR + Household code */}
              <div
                className="w-full grid bg-white border border-stone-200 rounded-xl p-3 items-center gap-3"
                style={{ gridTemplateColumns: "1fr 80px", boxShadow: "0 1px 3px rgba(0,0,0,.03)" }}
              >
                <div className="flex flex-col gap-1.5">
                  <div
                    className="border border-dashed border-stone-300 rounded px-2 py-1 font-mono text-[11px] text-stone-700"
                    style={{ background: "#f5f5f4" }}
                  >
                    HOUSEHOLD CODE:<br />
                    <strong className="text-[#9a3412] font-extrabold">{householdCode}</strong>
                  </div>
                  <p className="text-[9px] text-stone-400 leading-snug">
                    Scan QR to verify live community directory record.
                  </p>
                </div>
                <div
                  className="w-[76px] h-[76px] p-1 bg-white border border-stone-200 rounded flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            </div>

            {/* Card footer */}
            <div
              className="flex items-center justify-between px-4 py-2 text-[9px] border-t-2"
              style={{ background: "#1c1917", color: "#e7e5e4", borderTopColor: "#b45309" }}
            >
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><circle cx="12" cy="12" r="10" /></svg>
                AUTHENTICATED MEMBER PASS
              </span>
              <span>VALID FOR LIFETIME</span>
            </div>
          </div>
        </div>

        <p className="no-print mt-6 text-gray-500 text-xs">
          Click &quot;Print / Save PDF&quot; to generate a printable pass — use &quot;Save as PDF&quot; in the print dialog.
        </p>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          main { background: none !important; padding: 0 !important; justify-content: flex-start !important; }
          #lanyard-card { margin: 20px auto; box-shadow: 0 0 0 1px #000 !important; }
        }
      `}</style>
    </div>
  );
}
