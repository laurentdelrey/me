"use client";

import { useState } from "react";

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
  color: string; // "r,g,b" as a string
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

// Accepts "#bfbfbf" / "bfbfbf" / "191,191,191" — returns "r,g,b"
function parseColor(input: string): string {
  const trimmed = input.trim().replace(/^#/, "");
  // hex 6-digit
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    const r = parseInt(trimmed.slice(0, 2), 16);
    const g = parseInt(trimmed.slice(2, 4), 16);
    const b = parseInt(trimmed.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }
  // hex 3-digit
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    const r = parseInt(trimmed[0] + trimmed[0], 16);
    const g = parseInt(trimmed[1] + trimmed[1], 16);
    const b = parseInt(trimmed[2] + trimmed[2], 16);
    return `${r},${g},${b}`;
  }
  // already r,g,b
  if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }
  return input;
}

function rgbToHex(rgb: string): string {
  const parts = rgb.split(",").map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  return (
    "#" +
    parts
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
  );
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
  // Local text state for the hex field so typing doesn't clobber mid-edit
  const [hexDraft, setHexDraft] = useState<string>(() => rgbToHex(config.color));
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={panelButtonStyle}
      >
        vignette
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>vignette (temp)</span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            opacity: 0.6,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      <NumberSlider
        label="inner stop"
        value={config.innerStop}
        min={0}
        max={100}
        step={1}
        suffix="%"
        onChange={(v) => set({ innerStop: v })}
      />
      <NumberSlider
        label="mid stop"
        value={config.midStop}
        min={0}
        max={100}
        step={1}
        suffix="%"
        onChange={(v) => set({ midStop: v })}
      />
      <NumberSlider
        label="outer stop"
        value={config.outerStop}
        min={0}
        max={100}
        step={1}
        suffix="%"
        onChange={(v) => set({ outerStop: v })}
      />
      <NumberSlider
        label="mid α"
        value={config.midOpacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => set({ midOpacity: v })}
      />
      <NumberSlider
        label="outer α"
        value={config.outerOpacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => set({ outerOpacity: v })}
      />

      <div style={{ marginTop: 12, marginBottom: 6, opacity: 0.7, fontSize: 11 }}>
        color (hex or r,g,b)
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={rgbToHex(config.color) || "#000000"}
          onChange={(e) => {
            const rgb = parseColor(e.target.value);
            setHexDraft(e.target.value);
            set({ color: rgb });
          }}
          style={{
            width: 36,
            height: 28,
            padding: 0,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            borderRadius: 4,
            cursor: "pointer",
          }}
        />
        <input
          type="text"
          value={hexDraft}
          placeholder="#bfbfbf"
          onChange={(e) => {
            setHexDraft(e.target.value);
            const rgb = parseColor(e.target.value);
            if (/^\d+,\d+,\d+$/.test(rgb)) set({ color: rgb });
          }}
          style={{
            flex: 1,
            padding: "5px 8px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            borderRadius: 4,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
          }}
        />
      </div>

      <details style={{ marginTop: 14, opacity: 0.8 }}>
        <summary style={{ cursor: "pointer", fontSize: 11 }}>copy CSS</summary>
        <pre
          style={{
            marginTop: 6,
            padding: 8,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          {vignetteBackground(config)}
        </pre>
      </details>
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontSize: 11,
        }}
      >
        <span style={{ opacity: 0.7 }}>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#fff" }}
      />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 10000,
  pointerEvents: "auto",
  background: "rgba(18,18,18,0.92)",
  backdropFilter: "blur(8px)",
  color: "#fff",
  padding: 16,
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  width: 280,
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const panelButtonStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 10000,
  pointerEvents: "auto",
  background: "rgba(18,18,18,0.92)",
  backdropFilter: "blur(8px)",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  border: "1px solid rgba(255,255,255,0.08)",
  cursor: "pointer",
};
