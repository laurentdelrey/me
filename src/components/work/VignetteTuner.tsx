"use client";

/**
 * TEMPORARY floating panel for tuning the vignette live.
 * Delete this file + its import in page.tsx once the values are locked in.
 */

export type VignetteConfig = {
  innerStop: number; // % — where the transparent center ends
  midStop: number; // % — mid ring
  outerStop: number; // % — outer edge
  midOpacity: number; // 0–1
  outerOpacity: number; // 0–1
  color: string; // "r,g,b" as a string (kept tidy for serialization)
};

export const DEFAULT_VIGNETTE: VignetteConfig = {
  innerStop: 65,
  midStop: 90,
  outerStop: 100,
  midOpacity: 0.35,
  outerOpacity: 0.7,
  color: "40,40,40",
};

export function vignetteBackground(v: VignetteConfig): string {
  return `radial-gradient(ellipse at center, transparent ${v.innerStop}%, rgba(${v.color},${v.midOpacity}) ${v.midStop}%, rgba(${v.color},${v.outerOpacity}) ${v.outerStop}%)`;
}

export default function VignetteTuner({
  config,
  onChange,
}: {
  config: VignetteConfig;
  onChange: (c: VignetteConfig) => void;
}) {
  const set = (patch: Partial<VignetteConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 10000,
        pointerEvents: "auto",
        background: "rgba(20,20,20,0.85)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        padding: 14,
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "ui-monospace, monospace",
        minWidth: 260,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 10 }}>vignette (temp)</div>

      <Row label="inner stop">
        <Slider
          value={config.innerStop}
          min={0}
          max={100}
          step={1}
          onChange={(v) => set({ innerStop: v })}
        />
        <Num value={config.innerStop} suffix="%" />
      </Row>

      <Row label="mid stop">
        <Slider
          value={config.midStop}
          min={0}
          max={100}
          step={1}
          onChange={(v) => set({ midStop: v })}
        />
        <Num value={config.midStop} suffix="%" />
      </Row>

      <Row label="outer stop">
        <Slider
          value={config.outerStop}
          min={0}
          max={100}
          step={1}
          onChange={(v) => set({ outerStop: v })}
        />
        <Num value={config.outerStop} suffix="%" />
      </Row>

      <Row label="mid α">
        <Slider
          value={config.midOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ midOpacity: v })}
        />
        <Num value={config.midOpacity.toFixed(2)} />
      </Row>

      <Row label="outer α">
        <Slider
          value={config.outerOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ outerOpacity: v })}
        />
        <Num value={config.outerOpacity.toFixed(2)} />
      </Row>

      <Row label="color (rgb)">
        <input
          type="text"
          value={config.color}
          onChange={(e) => set({ color: e.target.value })}
          style={{
            flex: 1,
            padding: "2px 6px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            borderRadius: 3,
            fontFamily: "inherit",
            fontSize: 11,
          }}
        />
      </Row>

      <details style={{ marginTop: 12, opacity: 0.8 }}>
        <summary style={{ cursor: "pointer" }}>copy CSS</summary>
        <pre
          style={{
            marginTop: 6,
            padding: 8,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 11,
          }}
        >
          {vignetteBackground(config)}
        </pre>
      </details>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 45px",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <div style={{ opacity: 0.7 }}>{label}</div>
      {children}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: "100%" }}
    />
  );
}

function Num({ value, suffix }: { value: number | string; suffix?: string }) {
  return (
    <div style={{ textAlign: "right", opacity: 0.9, fontVariantNumeric: "tabular-nums" }}>
      {value}
      {suffix}
    </div>
  );
}
