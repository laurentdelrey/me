import React from "react";

export type EraId = "tldr" | "meta" | "free" | "snap" | "tribe" | "hustle" | "lost" | "kid" | "social";

export type Era = {
  id: EraId;
  label: string;
  // Optional override shown only on the prev/next era skip arrows.
  // Falls back to `label` when unset.
  navLabel?: string;
  years: string;
  startDate: [number, number, number]; // [year, month, day]
  location: [number, number]; // [lon, lat]
  zoom: number;
  city: string;
  color: string;
  // Precise year fraction bounds for media assignment
  startYear: number; // inclusive
  endYear: number; // exclusive (or Infinity for open-ended)
  content: React.ReactElement;
};

const linkClass = "hover:brightness-110 transition";

// Shared pill-button style for all inline links inside era text.
// Matches the PlayheadInfo control pills — plain accent grey, no accent colors.
// NOTE: WordReveal reads `style.color` to fade the text in; keep `color` set to white.
const linkStyle: React.CSSProperties = {
  color: "#ffffff",
  textDecoration: "none",
  display: "inline-block",
  margin: "2px 2px",
  padding: "0 8px",
  borderRadius: 4,
  background: "#b0b0b0",
  border: "1px solid rgba(255,255,255,0.2)",
  whiteSpace: "nowrap",
  lineHeight: 1.5,
  verticalAlign: "baseline",
  cursor: "none",
};

export const ERAS: Record<EraId, Era> = {
  tldr: {
    id: "tldr",
    label: "tl;dr",
    years: "",
    startDate: [2026, 4, 10],
    location: [-118.5976, 34.0378], // Topanga
    zoom: 12.5,
    city: "topanga, ca",
    color: "#FFB48F",
    startYear: 0,
    endYear: 0,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        i'm a designer currently living in los angeles, ca. i've been designing different type of things for the internet,
        from tiny controversial experiments to larger-scale consumer products through conceptual art images and prototypes i share on <a
          href="https://x.com/laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >twitter/x</a> and <a
          href="https://www.threads.net/@laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >threads</a>.
      </p>
    ),
  },
  meta: {
    id: "meta",
    label: "meta",
    navLabel: "instagram",
    years: "2025 – ???",
    startDate: [2025, 1, 6],
    location: [-122.1484, 37.4419], // Menlo Park
    zoom: 12.5,
    city: "menlo park, ca",
    color: "#60C4FF",
    startYear: 2025,
    endYear: Infinity,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white text-left text-shadow">
        I joined Meta to slide back into designing social products. After a year tinkering with internal and external models in the <a
          href="https://www.meta.com/superintelligence/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >Superintelligent Lab</a> I joined <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >Instagram</a> to focus on <a
          href="https://www.threads.net/@laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >Threads</a>
      </p>
    ),
  },
  free: {
    id: "free",
    label: "free ideas",
    years: "2023 – 2024",
    startDate: [2023, 9, 1],
    location: [-118.4912, 34.0195], // Santa Monica
    zoom: 12.5,
    city: "santa monica, ca",
    color: "#FFB48F",
    startYear: 2023 + 8 / 12, // Sep 2023
    endYear: 2024 + 12 / 12, // end of 2024
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        i started sharing free ideas organically on <a
          href="https://twitter.com/laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >twitter/x</a>,
        on apr 1 2021. the first idea was an april fool and i kept going from there.
        i use interface elements and internet brands to express my emotions and ideas.
      </p>
    ),
  },
  snap: {
    id: "snap",
    label: "snap, inc.",
    years: "2018 – 2023",
    startDate: [2018, 9, 1],
    location: [-118.4691, 33.9871], // Venice
    zoom: 12.5,
    city: "venice, ca",
    color: "#FFEE00",
    startYear: 2018,
    endYear: 2023 + 8 / 12, // Aug 2023
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        i've been a member of the core product design team at <a
          href="https://www.snap.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >snapchat</a>.
        a small pioneer group of inventors who disrupted the space.
        i've been honored to contribute to building for chat, calling, minis and the camera.
      </p>
    ),
  },
  tribe: {
    id: "tribe",
    label: "a quest called tribe",
    years: "2015 – 2018",
    startDate: [2015, 6, 1],
    location: [-122.4194, 37.7749], // SF
    zoom: 12,
    city: "san francisco, ca",
    color: "#B8FFA9",
    startYear: 2015,
    endYear: 2018,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        2 continents. 3 cities. 4 houses. 15 people. 4 products. 1 family.
        tribe was a series of social experiments backed by <a
          href="https://www.sequoiacap.com/#"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >sequoia capital</a> and <a
          href="https://www.kleinerperkins.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >kpcb</a>.
        a <a
          href="https://www.producthunt.com/posts/tribe-2-0"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >messaging app</a>, a <a
          href="https://www.producthunt.com/posts/tribe-calls"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >calling app</a> and a <a
          href="https://www.producthunt.com/posts/tribe-games"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >gaming app</a>.
      </p>
    ),
  },
  hustle: {
    id: "hustle",
    label: "hustling for fun",
    years: "2012 – 2014",
    startDate: [2012, 6, 1],
    location: [2.3618, 48.8709], // Paris 10e
    zoom: 13.5,
    city: "paris, france",
    color: "#F68364",
    startYear: 2012,
    endYear: 2015,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        i've released a bunch of side projects. from an <a
          href="https://www.instagram.com/balencyoga/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >ironic fan brand</a> inspired by balenciaga,
        the missing <a
          href="https://www.producthunt.com/posts/snapchatters"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >"explore" section</a> of snapchat, or <a
          href="https://twitter.com/laurentdelrey/status/1009135685960232961"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >collectible cards</a> on the ethereum network.
        the one that blew up the most though was a controversial email-based app called <a
          href="https://twitter.com/justleakit"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >leak</a>.
      </p>
    ),
  },
  lost: {
    id: "lost",
    label: "lost in the game",
    years: "2007 – 2012",
    startDate: [2007, 9, 1],
    location: [2.2885, 48.8412], // Paris 15e
    zoom: 13.5,
    city: "paris, france",
    color: "#FFB48F",
    startYear: 2007,
    endYear: 2012,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        i have a master degree in finance. i've never studied design at school.
        during my college years, i created a bunch of <a
          href="https://www.konbini.com/fr/3-0/un-tumblr-histoire-internet-picasso-jay-z"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >tumblrs</a>,
        curated a newsletter of torrent links, made merch for several french colleges, interned at leetchi and also created my first social app.
      </p>
    ),
  },
  kid: {
    id: "kid",
    label: "another internet kid",
    years: "2005 – 2007",
    startDate: [2005, 1, 1],
    location: [2.5185, 48.8407], // Bry-sur-Marne
    zoom: 13,
    city: "suburbs of paris",
    color: "#ffffff",
    startYear: 2005,
    endYear: 2007,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
        born and raised in paris, france. i started designing at 16 on a cracked version of photoshop cs2.
        my first gigs were terrible logos & websites for my counter strike friends.
        aim, msn or mirc. the early days of remote work.
      </p>
    ),
  },
  social: {
    id: "social",
    label: "@ me",
    years: "",
    startDate: [2026, 4, 10],
    location: [-118.5976, 34.0378], // Topanga
    zoom: 12.5,
    city: "",
    color: "#FFB48F",
    startYear: 0,
    endYear: 0,
    content: (
      <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="lowercase text-left text-shadow">
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>dms are opened on</span> <a
          href="https://twitter.com/laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >twitter/x</a> <span style={{ color: 'rgba(255,255,255,0.5)' }}>and</span> <a
          href="https://t.me/laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          className={linkClass}
        >telegram</a><span style={{ color: 'rgba(255,255,255,0.5)' }}>. </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>i can do</span> <a
          href="mailto:laurent.desserrey@gmail.com?subject=Hi%20there"
          style={linkStyle}
          className={linkClass}
        >email</a> <span style={{ color: 'rgba(255,255,255,0.5)' }}>too.</span>
        <br />
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>love.</span>
      </p>
    ),
  },
};

// Ordered list of eras for timeline (oldest → newest)
export const ERA_ORDER: EraId[] = [
  "kid",
  "lost",
  "hustle",
  "tribe",
  "snap",
  "free",
  "meta",
];

// Convert "YYYY-MM-DD" to fractional year
export function dateToYearFrac(date: string): number {
  const y = parseInt(date.substring(0, 4));
  const m = parseInt(date.substring(5, 7));
  const d = parseInt(date.substring(8, 10));
  return y + (m - 1) / 12 + (d - 1) / 365;
}

// Find which era a date belongs to
export function dateToEraId(date: string): EraId | null {
  const y = dateToYearFrac(date);
  for (const id of ERA_ORDER) {
    const era = ERAS[id];
    if (y >= era.startYear && y < era.endYear) return id;
  }
  return null;
}
