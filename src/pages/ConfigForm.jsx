import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Rocket,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useScanStore } from "@/lib/scanStore";
import { cn } from "@/lib/utils";
import GlitchButton from "@/components/GlitchButton";
import ChipsInput from "@/components/ChipsInput";
import DecryptedText from "@/components/DecryptedText";

const MODE_META = {
  black_box: {
    name: "BLACK-BOX",
    color: "#00FF9C",
    fields: [
      { key: "target", label: "TARGET", required: true, type: "text", placeholder: "https://demo.testfire.net or 10.0.0.5:8080" },
      { key: "exclusions_hosts", label: "EXCLUSIONS // HOSTS", type: "chips", placeholder: "10.0.0.1" },
      { key: "exclusions_paths", label: "EXCLUSIONS // PATHS", type: "chips", placeholder: "/billing/*" },
    ],
  },
  gray_box: {
    name: "GRAY-BOX",
    color: "#22D3EE",
    fields: [
      { key: "cloud_accounts", label: "CLOUD ACCOUNTS", required: true, type: "chips", placeholder: "123456789012" },
      { key: "domains", label: "DOMAINS", type: "chips", placeholder: "corp.example" },
      { key: "cidrs", label: "CIDRS", type: "chips", placeholder: "10.0.0.0/24" },
    ],
  },
  white_box: {
    name: "WHITE-BOX",
    color: "#FFB020",
    fields: [
      { key: "repos", label: "REPO PATHS", required: true, type: "chips", placeholder: "/srv/checkouts/my-app" },
    ],
    hint: "Paths are read server-side. Code must already be placed/cloned on the server.",
  },
};

const DEFAULTS = {
  authorised_by: "operator",
  authorisation_ref: "",
  planner: "rule",
  max_approvals: 5,
};

function Field({ label, required, children, error, hint }) {
  return (
    <div>
      <label className="label-xs mb-1.5 block">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 font-mono text-[11px] text-[#FFB020]/80 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 font-mono text-[11px] text-destructive flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ConfigForm() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const { addScan } = useScanStore();
  const meta = MODE_META[mode];

  const [values, setValues] = useState({});
  const [adv, setAdv] = useState(DEFAULTS);
  const [showAdv, setShowAdv] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center font-mono">
        <p className="text-destructive">// unknown mode: {mode}</p>
        <button
          onClick={() => navigate("/scan")}
          className="mt-4 text-accent text-xs uppercase tracking-wider"
        >
          ← back to modes
        </button>
      </div>
    );
  }

  const set = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    meta.fields.forEach((f) => {
      if (f.required) {
        const v = values[f.key];
        const empty = !v || (Array.isArray(v) ? v.length === 0 : !v.trim());
        if (empty) e[f.key] = "required — cannot be empty";
        else if (f.key === "target" && !/.+\..+|^\d+\.\d+\.\d+\.\d+/.test(v.trim()))
          e[f.key] = "enter a URL or host[:port]";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    const payload = { mode };
    meta.fields.forEach((f) => {
      const v = values[f.key];
      if (v === undefined) return;
      if (Array.isArray(v)) {
        if (v.length) payload[f.key] = v;
      } else if (v.trim()) {
        payload[f.key] = v.trim();
      }
    });
    if (adv.authorised_by !== DEFAULTS.authorised_by)
      payload.authorised_by = adv.authorised_by;
    if (adv.authorisation_ref.trim())
      payload.authorisation_ref = adv.authorisation_ref.trim();
    if (adv.planner !== DEFAULTS.planner) payload.planner = adv.planner;
    if (Number(adv.max_approvals) !== DEFAULTS.max_approvals)
      payload.max_approvals = Number(adv.max_approvals);
    return payload;
  };

  const launch = async () => {
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.startScan(buildPayload());
      const job = {
        job_id: res.job_id,
        mode,
        status: res.status || "queued",
        input: values.target || (values.cloud_accounts || values.repos || [])[0] || "—",
      };
      addScan(job);
      navigate(`/monitor/${res.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setServerError(err.message);
        } else if (err.status === 400) {
          setServerError(`Malformed request — ${err.message}`);
        } else {
          setServerError(`[${err.status}] ${err.message}`);
        }
      } else {
        setServerError(err.message || "launch failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate("/scan")}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> modes
      </button>

      <div className="label-xs mb-2">// STEP 02 — CONFIGURE</div>
      <h1 className="font-display font-bold text-2xl md:text-3xl mb-1">
        <DecryptedText text={meta.name} />
        <span className="text-muted-foreground"> engagement</span>
      </h1>
      <p className="font-mono text-xs text-muted-foreground mb-8">
        Fill the required inputs. Optional fields are omitted when empty.
      </p>

      <div className="space-y-5">
        {meta.fields.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            required={f.required}
            error={errors[f.key]}
            hint={f.hint}
          >
            {f.type === "chips" ? (
              <ChipsInput
                values={values[f.key] || []}
                onChange={(v) => set(f.key, v)}
                placeholder={f.placeholder}
                id={f.key}
              />
            ) : (
              <div className="relative">
                <input
                  id={f.key}
                  value={values[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <span className="cursor-block absolute right-3 top-1/2 -translate-y-1/2 opacity-0 focus-within:opacity-100 transition-opacity" />
              </div>
            )}
          </Field>
        ))}

        {/* Advanced */}
        <div className="border border-border/15 rounded-sm">
          <button
            type="button"
            onClick={() => setShowAdv((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Advanced / Authorization</span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", showAdv && "rotate-180")}
            />
          </button>
          {showAdv && (
            <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/15">
              <Field label="AUTHORISED BY">
                <input
                  value={adv.authorised_by}
                  onChange={(e) => setAdv((p) => ({ ...p, authorised_by: e.target.value }))}
                  className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
                />
              </Field>
              <Field label="AUTH REF (blank = auto)">
                <input
                  value={adv.authorisation_ref}
                  onChange={(e) => setAdv((p) => ({ ...p, authorisation_ref: e.target.value }))}
                  placeholder="auto-generated"
                  className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent"
                />
              </Field>
              <Field label="PLANNER">
                <div className="flex border border-border/30 rounded-sm overflow-hidden">
                  {["rule", "llm"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdv((s) => ({ ...s, planner: p }))}
                      className={cn(
                        "flex-1 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
                        adv.planner === p
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="MAX APPROVALS">
                <div className="flex items-center border border-border/30 rounded-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setAdv((s) => ({ ...s, max_approvals: Math.max(0, Number(s.max_approvals) - 1) }))
                    }
                    className="px-3 py-2 font-mono text-muted-foreground hover:text-foreground"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={adv.max_approvals}
                    onChange={(e) => setAdv((s) => ({ ...s, max_approvals: e.target.value }))}
                    className="w-full bg-transparent text-center font-mono text-sm text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAdv((s) => ({ ...s, max_approvals: Number(s.max_approvals) + 1 }))
                    }
                    className="px-3 py-2 font-mono text-muted-foreground hover:text-foreground"
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* ROE banner */}
        <div className="flex items-start gap-3 p-3 border border-[#FFB020]/30 bg-[#FFB020]/5 rounded-sm">
          <AlertTriangle className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground/80 leading-relaxed">
            <span className="text-[#FFB020] font-bold">ROE NOTICE — </span>
            Only submit targets you are authorized to test. Every engagement is
            recorded in a tamper-evident audit chain.
          </p>
        </div>

        {serverError && (
          <div className="p-3 border border-destructive/40 bg-destructive/5 rounded-sm font-mono text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {serverError}
          </div>
        )}

        <GlitchButton
          onClick={launch}
          disabled={submitting}
          className="w-full py-3.5 text-base"
          variant="danger"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> LAUNCHING…
            </>
          ) : (
            <>
              <span className="cursor-block mr-1" />
              <Rocket className="w-4 h-4" />
              LAUNCH ENGAGEMENT
            </>
          )}
        </GlitchButton>
      </div>
    </div>
  );
}