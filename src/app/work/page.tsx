"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { motion } from "motion/react";
import SiteHeader from "@/components/SiteHeader";
import dynamic from "next/dynamic";
import { AnimatedText } from "@/components/AnimatedText";
import { VerticalScrollProgress, TimelineTrack, TimelineBracket } from "@/components/VerticalScrollProgress";
import { IPadCursor } from "@/components/IPadCursor";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";
import tweetsData from "@/data/tweets.json";
import type { Tweet } from "@/components/EraGallery";

// Dynamic import to avoid SSR issues with Mapbox
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const EraGallery = dynamic(() => import("@/components/EraGallery"), { ssr: false });
const GalleryTooltip = dynamic(() => import("@/components/GalleryTooltip"), { ssr: false });
const AwardGrid = dynamic(() => import("@/components/AwardGrid"), { ssr: false });

// Map section IDs to date ranges for tweet assignment
const ERA_RANGES: Record<string, [number, number]> = {
  meta: [2025, 2099],
  free: [2021, 2024],
  snap: [2018, 2020],
};

// Extract start year from section's years string (e.g. "2018 – 2023" → 2018)
function getStartYear(years: string): number | null {
  const match = years.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function getTweetsForEra(sectionId: string, hiddenIds?: Set<string>): Tweet[] {
  const range = ERA_RANGES[sectionId];
  if (!range) return [];
  return (tweetsData as Tweet[]).filter((t) => {
    if (t.hidden || !t.media[0]?.blobUrl) return false;
    if (hiddenIds?.has(t.id)) return false;
    const year = parseInt(t.date.substring(0, 4));
    return year >= range[0] && year <= range[1];
  });
}

// timeYears: approximate duration in years, used to set proportional min-heights
const sections = [
  { id: "tldr", label: "TL;DR", years: "", startDate: [2026, 4, 10] as [number, number, number], location: [-118.5976, 34.0378] as [number, number], zoom: 12.5, city: "topanga, ca", color: "#FFB48F", timeYears: 0 },
  { id: "meta", label: "meta", years: "2025 – ???", startDate: [2025, 1, 6] as [number, number, number], location: [-122.1484, 37.4419] as [number, number], zoom: 12.5, city: "menlo park, ca", color: "#60C4FF", timeYears: 1.3 },
  { id: "free", label: "free ideas", years: "2021 – ???", startDate: [2021, 4, 1] as [number, number, number], location: [-118.4912, 34.0195] as [number, number], zoom: 12.5, city: "santa monica, ca", color: "#FFB48F", timeYears: 4 },
  { id: "snap", label: "Snap, Inc.", years: "2018 – 2023", startDate: [2018, 8, 1] as [number, number, number], location: [-118.4691, 33.9871] as [number, number], zoom: 12.5, city: "venice, ca", color: "#FFEE00", timeYears: 5 },
  { id: "tribe", label: "A Quest called Tribe", years: "2015 – 2018", startDate: [2015, 3, 1] as [number, number, number], location: [-122.4194, 37.7749] as [number, number], zoom: 12, city: "san francisco, ca", color: "#B8FFA9", timeYears: 3 },
  { id: "hustle", label: "Hustling for fun", years: "2012 – 2014", startDate: [2012, 6, 1] as [number, number, number], location: [2.3618, 48.8709] as [number, number], zoom: 13.5, city: "paris, france", color: "#F68364", timeYears: 2 },
  { id: "lost", label: "Lost in the game", years: "2007 – 2012", startDate: [2007, 9, 1] as [number, number, number], location: [2.2885, 48.8412] as [number, number], zoom: 13.5, city: "paris, france", color: "#FFB48F", timeYears: 5 },
  { id: "kid", label: "Another Internet Kid", years: "2005 – 2007", startDate: [2005, 1, 1] as [number, number, number], location: [2.5185, 48.8407] as [number, number], zoom: 13, city: "suburbs of paris", color: "#ffffff", timeYears: 2 },
  { id: "social", label: "@ Me", years: "@", startDate: [2026, 4, 10] as [number, number, number], location: [-118.5976, 34.0378] as [number, number], zoom: 12.5, city: "", color: "#FFB48F", timeYears: 0 },
];

// 1 year = 80vh of scroll height — sections are sized by time, not content
const VH_PER_YEAR = 80;

const getContent = (activeSection: number): Record<string, React.ReactElement> => ({
  tldr: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={0} isActive={activeSection === 0}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          i'm a designer currently living in los angeles, ca. i've been designing different type of things for the internet,
          from tiny controversial experiments to larger-scale consumer products through conceptual art images and prototypes i share on <a
            href="https://x.com/laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >twitter/x</a> and <a
            href="https://www.threads.net/@laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >threads</a>.
        </p>
      </AnimatedText>
    </div>
  ),
  meta: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={1} isActive={activeSection === 1}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          i joined the <a
            href="https://www.meta.com/superintelligence/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60C4FF', textDecoration: 'none' }}
            className="hover:underline"
          >meta</a> super intelligence lab in january. since then i've been jamming with frontier models to design original social experiences mostly on ios and web sometimes. i recently joined <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60C4FF', textDecoration: 'none' }}
            className="hover:underline"
          >instagram</a> to do similar things directly within the <a
            href="https://www.threads.net/@laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60C4FF', textDecoration: 'none' }}
            className="hover:underline"
          >threads</a> product team.
        </p>
      </AnimatedText>
    </div>
  ),
  free: (
    <div style={{ maxWidth: '720px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={2} isActive={activeSection === 2}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          i started sharing free ideas organically on <a
            href="https://twitter.com/laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >twitter/x</a>,
          on apr 1 2021. the first idea was an april fool and i kept going from there.
          i use interface elements and internet brands to express my emotions and ideas.
        </p>
      </AnimatedText>
    </div>
  ),
  snap: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={3} isActive={activeSection === 3}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          I've been a member of the core product design team at <a
            href="https://www.snap.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFEE00', textDecoration: 'none' }}
            className="hover:underline"
          >snapchat</a>.
          A small pioneer group of inventors who disrupted the space.
          I've been honored to contribute to building for chat, calling, minis and the camera.
        </p>
      </AnimatedText>
    </div>
  ),
  tribe: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={4} isActive={activeSection === 4}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          2 continents. 3 cities. 4 houses. 15 people. 4 products. 1 family.
          Tribe was a series of social experiments backed by <a
            href="https://www.sequoiacap.com/#"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8FFA9', textDecoration: 'none' }}
            className="hover:underline"
          >Sequoia Capital</a> and <a
            href="https://www.kleinerperkins.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8FFA9', textDecoration: 'none' }}
            className="hover:underline"
          >KPCB</a>.
          A <a
            href="https://www.producthunt.com/posts/tribe-2-0"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8FFA9', textDecoration: 'none' }}
            className="hover:underline"
          >messaging app</a>, a <a
            href="https://www.producthunt.com/posts/tribe-calls"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8FFA9', textDecoration: 'none' }}
            className="hover:underline"
          >calling app</a> and a <a
            href="https://www.producthunt.com/posts/tribe-games"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8FFA9', textDecoration: 'none' }}
            className="hover:underline"
          >gaming app</a>.
        </p>
      </AnimatedText>
    </div>
  ),
  hustle: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={5} isActive={activeSection === 5}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          I've released a bunch of side projects. From an <a
            href="https://www.instagram.com/balencyoga/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >ironic fan brand</a> inspired by Balenciaga (<a
            href="https://www.elle.vn/tin-thoi-trang/balencyoga-tan-binh-cua-con-sot-trao-phung-trong-thoi-trang?fbclid=IwAR1Y7FE8jI8WY9SrK3vR7T0K8JQMcV_zleFzdo0TaXJU1FWLvnHrEBwXlPk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >1</a>,<a
            href="https://hypebeast.kr/2017/7/balencyoga-balenciaga-parody-collection?utm_source=facebook&utm_medium=social&utm_campaign=share+buttons&fbclid=IwAR2ltqy29D_KfBiDdQFM55yZTvTKOIQfSfqFsQWNKlnnjgbS-sPWcOCz2JY"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >2</a>,<a
            href="https://www.vogue.ru/fashion/news/balencyoga_gibkiy_otvet_balenciaga/?fbclid=IwAR2A0AdYsxkEiNzvpsrtW8RtNt4aQQx0e47LgdjjqloAnl6t5nweGDPmcYE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >3</a>),
          the missing <a
            href="https://www.producthunt.com/posts/snapchatters"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >"Explore" section</a> of Snapchat, or <a
            href="https://twitter.com/laurentdelrey/status/1009135685960232961"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >Collectible Cards</a> on the Ethereum network.
          The one that blew up the most though was a controversial email-based app called <a
            href="https://twitter.com/justleakit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >Leak</a> (<a
            href="https://twitter.com/MarxMedia/status/497380416501084160"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >1</a>,<a
            href="https://twitter.com/justleakit/status/496255472820039680"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >2</a>,<a
            href="https://www.washingtonpost.com/news/the-intersect/wp/2014/07/29/a-new-app-will-let-you-send-anonymous-e-mail-to-anyone-which-sounds-like-a-disaster-waiting-to-happen/?Post%20generic=%3Ftid%3Dsm_twitter_washingtonpost&noredirect=on&utm_term=.3b2ec28fb9a8"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >3</a>,<a
            href="https://www.chicagotribune.com/business/careers/ct-biz-0825-work-advice-huppke-20140825-column.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >4</a>,<a
            href="https://www.dailydot.com/debug/leak-anonymous-email/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >5</a>,<a
            href="https://www.businessinsider.com/send-anonymous-emails-with-leak-website-2014-7"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >6</a>,<a
            href="https://www.fastcompany.com/3033705/i-lied-to-you-a-few-days-ago-the-leak-app-and-anonymous-honesty"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >7</a>,<a
            href="https://thenextweb.com/socialmedia/2014/07/28/leak-lets-send-nearly-anonymous-emails-friends-family-enemies/?utm_source=t.co&utm_medium=referral&utm_content=Leak+lets+you+send+nearly+anonymous+emails+to+friends%2C+family+and+enemies&utm_campaign=Twitter+Publisher#.tnw_yD56EVxS"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >8</a>,<a
            href="https://mashable.com/2014/08/04/leak-anonymous-email/#gMOq6WVLfaqM"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >9</a>,<a
            href="https://www.engadget.com/2014/08/04/leak-anonymous-email/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >10</a>,<a
            href="https://www.cosmopolitan.com/lifestyle/news/a29522/leak-website-anonymous-email/?src=spr_TWITTER&spr_id=1440_76579580"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >11</a>,<a
            href="https://motherboard.vice.com/en_us/article/qkvjjq/why-anonymous-messaging-services-are-full-of-bitching-and-flirting"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >12</a>,<a
            href="https://pando.com/2014/08/04/anonymity-app-pulls-off-one-of-the-worst-tech-pr-stunts-ever-attempted/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >13</a>,<a
            href="https://www.konbini.com/fr/tendances-2/leak-messagerie-anonyme-flirter/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >14</a>,<a
            href="https://www.lesinrocks.com/2014/08/11/actualite/leak-lapplication-surfe-retour-lanonymat-11518963/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F68364', textDecoration: 'none' }}
            className="hover:underline"
          >15</a>).
        </p>
      </AnimatedText>
    </div>
  ),
  lost: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={6} isActive={activeSection === 6}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          I have a Master Degree in Finance. I've never studied Design at school.
          During my College years, I created a bunch of Tumblrs (<a
            href="https://www.konbini.com/fr/3-0/un-tumblr-histoire-internet-picasso-jay-z"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >1</a>,<a
            href="https://twitter.com/search?q=jeprendslemetro.tumblr.com&src=typd"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >2</a>) <span style={{ color: '#999999' }}>receiving 100,000+ visits</span>,
          curated a newsletter of torrent links called Le Video Club (<a
            href="https://medium.com/le-futur-de-la-distribution-de-films-en-france/vie-et-mort-dun-service-illegal-de-vod-117ac172308c"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >RIP</a>),
          made merch for several French Colleges (<a
            href="https://vimeo.com/26993365?fbclid=IwAR0TudM-UkXbfXh_nPv1hD3yBvxCj9bnuX9vbZjGasusQuT-QgJbUm-oBiE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >1</a>), interned at Leetchi - the "<a
            href="https://www.wired.co.uk/article/paris-3"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >Hottest Startup #1 in Paris (Wired)</a>"
          and also created my first social app (<a
            href="https://www.youtube.com/watch?v=bAiHnmfvcmc"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >1</a>,<a
            href="https://www.youtube.com/watch?v=diPZrGIODM0&t=1s"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >2</a>,<a
            href="https://twitter.com/search?q=linkility&src=typd"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >3</a>).
        </p>
      </AnimatedText>
    </div>
  ),
  kid: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={7} isActive={activeSection === 7}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="text-white lowercase text-left text-shadow">
          Born and raised in Paris, France. I started designing at 16 on a cracked version of Photoshop CS2.
          My first gigs were terrible logos & websites for my Counter Strike friends.
          AIM, MSN or mIRC. The early days of remote work.
        </p>
      </AnimatedText>
    </div>
  ),
  social: (
    <div style={{ maxWidth: '480px' }} className="section-xpad">
      <AnimatedText delay={100} sectionIndex={8} isActive={activeSection === 8}>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75' }} className="lowercase text-left text-shadow">
          <span style={{ color: '#999999' }}>DMs are opened on</span> <a
            href="https://twitter.com/laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >twitter/x</a> <span style={{ color: '#999999' }}>and</span> <a
            href="https://t.me/laurentdelrey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >Telegram</a><span style={{ color: '#999999' }}>. </span>
          <span style={{ color: '#999999' }}>I can do</span> <a
            href="mailto:laurent.desserrey@gmail.com?subject=Hi%20there"
            style={{ color: '#FFB48F', textDecoration: 'none' }}
            className="hover:underline"
          >email</a> <span style={{ color: '#999999' }}>too.</span>
          <br />
          <span style={{ color: '#999999' }}>Love.</span>
        </p>
      </AnimatedText>
    </div>
  ),
});

export default function WorkPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [headerStartY, setHeaderStartY] = useState(240);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredTweet, setHoveredTweet] = useState<Tweet | null>(null);
  const [visibleDate, setVisibleDate] = useState<[number, number, number] | null>(null);
  const [timelineTracks, setTimelineTracks] = useState<TimelineTrack[]>([]);
  const [timelineBrackets, setTimelineBrackets] = useState<TimelineBracket[]>([]);
  const currentSection = sections[activeSection];

  // Determine if current section has a gallery
  const hasGallery = (sectionId: string) => ERA_RANGES[sectionId] !== undefined;

  // H key to hide tweets
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    for (const t of tweetsData as Tweet[]) {
      if (t.hidden) hidden.add(t.id);
    }
    return hidden;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "h" || e.key === "H") && hoveredTweet) {
        e.preventDefault();
        const id = hoveredTweet.id;
        setHiddenIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          console.log("[WorkGallery] Hidden IDs:", JSON.stringify([...next]));
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoveredTweet]);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => {
      setHeaderVisible(true);
    }, 500);
    const computeStartY = () => {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      setHeaderStartY(Math.max(0, Math.round(vh / 2 - 60)));
    };
    computeStartY();
    window.addEventListener('resize', computeStartY);
    return () => window.removeEventListener('resize', computeStartY);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      let currentSectionIndex = 0;
      let accumulatedHeight = 0;

      for (let i = 0; i < sections.length; i++) {
        const sectionEl = sectionRefs.current[i];
        const sectionHeight = sectionEl ? sectionEl.offsetHeight : containerHeight;

        if (scrollTop < accumulatedHeight + sectionHeight / 2) {
          currentSectionIndex = i;
          break;
        }

        accumulatedHeight += sectionHeight;
        currentSectionIndex = i;
      }

      const newActiveSection = Math.max(0, Math.min(sections.length - 1, currentSectionIndex));

      if (newActiveSection !== activeSection) {
        setActiveSection(newActiveSection);
      }

      // Track visible tweet date — only when scrolled into gallery portion
      // Recalculate accumulatedHeight up to the active section
      let sectionTop = 0;
      for (let i = 0; i < newActiveSection; i++) {
        const el = sectionRefs.current[i];
        sectionTop += el ? el.offsetHeight : containerHeight;
      }

      const section = sections[newActiveSection];
      if (section && hasGallery(section.id)) {
        const sectionEl = sectionRefs.current[newActiveSection];
        if (sectionEl) {
          const galleryStart = sectionTop + containerHeight; // after 100vh text
          const eraTweets = getTweetsForEra(section.id, hiddenIds);

          if (eraTweets.length > 0 && scrollTop >= galleryStart) {
            // We're in the gallery portion
            const galleryHeight = sectionEl.offsetHeight - containerHeight;
            const galleryScroll = scrollTop - galleryStart;
            const progress = Math.min(1, galleryScroll / Math.max(1, galleryHeight));
            const idx = Math.min(eraTweets.length - 1, Math.floor(progress * eraTweets.length));
            const d = eraTweets[idx]?.date;
            if (d) {
              const parts = d.split("-");
              setVisibleDate([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])]);
            }
          } else {
            // Still in text portion — show section start date
            setVisibleDate(null);
          }
        }
      } else {
        setVisibleDate(null);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeSection]);

  // Track computation — extracted so it can be called from multiple places
  const computeTracksRef = useRef<() => void>(() => {});
  computeTracksRef.current = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const totalHeight = container.scrollHeight;
    if (totalHeight === 0) return;

    const positions: Record<string, { start: number; end: number }> = {};
    let acc = 0;
    for (let i = 0; i < sections.length; i++) {
      const el = sectionRefs.current[i];
      const h = el ? el.offsetHeight : container.clientHeight;
      positions[sections[i].id] = { start: acc / totalHeight, end: (acc + h) / totalHeight };
      acc += h;
    }

    const TRACK_COLORS: Record<string, string> = {
      tldr: '#ffffff', meta: '#60C4FF', snap: '#FFEE00',
      tribe: '#B8FFA9', hustle: '#F68364', lost: '#999999', kid: '#ffffff',
    };

    const tracks: TimelineTrack[] = [];
    for (const s of sections) {
      if (s.id === 'social') continue;
      const pos = positions[s.id];
      if (!pos) continue;
      tracks.push({
        id: s.id,
        label: s.id === 'free' ? '' : s.label,
        color: s.id === 'free' ? '#ffffff' : (TRACK_COLORS[s.id] || '#ffffff'),
        scrollStart: pos.start,
        scrollEnd: pos.end,
      });
    }

    const brackets: TimelineBracket[] = [];
    const metaPos = positions['meta'];
    const snapPos = positions['snap'];
    if (metaPos && snapPos) {
      brackets.push({
        id: 'free-bracket',
        label: 'free ideas',
        color: '#FFB48F',
        scrollStart: metaPos.start,
        scrollEnd: snapPos.end,
      });
    }

    setTimelineTracks(tracks);
    setTimelineBrackets(brackets);
  };

  // Recompute tracks on mount, resize, and periodically as images load
  useEffect(() => {
    if (!mounted) return;
    const compute = () => computeTracksRef.current();
    const t1 = setTimeout(compute, 500);
    const t2 = setTimeout(compute, 2000);
    const t3 = setTimeout(compute, 5000);
    const t4 = setTimeout(compute, 10000);
    window.addEventListener('resize', compute);
    // Also recompute on scroll idle (catches images loading between scrolls)
    const container = scrollContainerRef.current;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const onScrollIdle = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(compute, 500);
    };
    container?.addEventListener('scroll', onScrollIdle, { passive: true });
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(scrollTimeout);
      window.removeEventListener('resize', compute);
      container?.removeEventListener('scroll', onScrollIdle);
    };
  }, [mounted, mapLoaded]);

  const scrollToSection = (index: number) => {
    const el = sectionRefs.current[index];
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    // Determine direction for slide
    const goingDown = index > activeSection;
    const slideOut = goingDown ? '-30px' : '30px';
    const slideIn = goingDown ? '30px' : '-30px';
    // Slide + fade out
    container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    container.style.opacity = '0';
    container.style.transform = `translateY(${slideOut})`;
    setTimeout(() => {
      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';
      let top = 0;
      let sibling = container.firstElementChild;
      let count = 0;
      while (sibling && count < index) {
        top += (sibling as HTMLElement).offsetHeight;
        sibling = sibling.nextElementSibling;
        count++;
      }
      container.scrollTop = top;
      // Position for slide in from opposite direction
      container.style.transition = 'none';
      container.style.transform = `translateY(${slideIn})`;
      requestAnimationFrame(() => {
        container.style.scrollSnapType = 'y mandatory';
        container.style.scrollBehavior = '';
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        // Recompute tracks after navigation
        setTimeout(() => computeTracksRef.current(), 100);
      });
    }, 250);
  };

  return (
    <>
      {mounted && typeof window !== 'undefined' && window.innerWidth > 768 && (
        <IPadCursor />
      )}

      <Map
        center={currentSection?.location || [-74.006, 40.7128]}
        zoom={currentSection?.zoom || 11}
        onLoad={() => setMapLoaded(true)}
      />

      <GalleryTooltip tweet={hoveredTweet} />

      <SiteHeader
        animated
        toTop={mapLoaded}
        visible={headerVisible && mounted}
        startY={headerStartY}
        topPaddingPx={28}
        color="#ffffff"
        onClick={() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

      {/* Rolling date — top left, just the date, no dropdown */}
      {(() => {
        const date = visibleDate || currentSection?.startDate;
        if (!date || !mapLoaded) return null;
        const [year, month, day] = date;
        return (
          <div
            className="fixed"
            data-no-cursor-expand
            style={{ top: '32px', left: '32px', zIndex: 9998, cursor: 'none' }}
          >
            <div
              className="text-white"
              style={{ fontSize: '0.8rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <SlidingNumber value={year} />
              <span className="text-white/30">.</span>
              <SlidingNumber value={month} padStart />
              <span className="text-white/30">.</span>
              <SlidingNumber value={day} padStart />
            </div>
          </div>
        );
      })()}

      <main className={`h-screen relative z-10 overflow-hidden ${mounted && mapLoaded ? 'animate-fadeIn' : 'opacity-0'}`}>

        <VerticalScrollProgress
          containerRef={scrollContainerRef}
          tracks={timelineTracks}
          brackets={timelineBrackets}
          activeSection={currentSection?.id}
          onNavigate={(id) => {
            // Map bracket ids to section ids
            const sectionId = id === 'free-bracket' ? 'free' : id;
            const idx = sections.findIndex((s) => s.id === sectionId);
            if (idx >= 0) scrollToSection(idx);
          }}
        />

        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto scroll-smooth hide-scrollbar"
          style={{
            scrollSnapType: 'y mandatory'
          }}
        >
          {sections.map((section, index) => {
            const eraTweets = getTweetsForEra(section.id, hiddenIds);
            const sectionHasGallery = eraTweets.length > 0;

            // Section height is purely time-based
            const timeHeight = section.timeYears > 0
              ? `${Math.max(100, section.timeYears * VH_PER_YEAR)}vh`
              : '100vh';

            return (
              <div
                key={section.id}
                ref={el => { sectionRefs.current[index] = el; }}
                style={{
                  scrollSnapAlign: sectionHasGallery ? 'start' : 'center',
                  height: timeHeight,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                {/* Text content — always 100vh centered */}
                <div
                  className="flex flex-col items-center justify-center relative"
                  style={{
                    width: '100%',
                    height: '100vh',
                    paddingTop: 'calc(var(--header-h) - var(--footer-h) / 2)',
                    paddingBottom: '0',
                    boxSizing: 'border-box',
                  }}
                >
                  {(section.id === 'tribe' || section.id === 'hustle') && (
                    <AwardGrid section={section.id} containerRef={scrollContainerRef} />
                  )}

                  <div style={{ maxWidth: '480px', width: '100%', position: 'relative', zIndex: 10 }}>
                    {section.label && (
                      <div className="section-xpad" style={{ marginBottom: '10px' }}>
                        <h2 className="text-white lowercase text-shadow section-title" style={{
                          fontSize: '1rem',
                          lineHeight: '1.5',
                          fontWeight: 500,
                        }}>
                          {section.label}
                        </h2>
                      </div>
                    )}

                    <div className="section-content section-xpad" style={{ marginBottom: '10px' }}>
                      {getContent(activeSection)[section.id]}
                    </div>

                    {section.city && (
                      <div className="section-xpad">
                        <p className="lowercase section-location" style={{
                          fontSize: '1.05rem',
                          color: '#999999',
                        }}>
                          {section.city}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery below text for sections with tweets */}
                {sectionHasGallery && (
                  <div style={{ padding: '0 8% 60px' }}>
                    <EraGallery
                      tweets={eraTweets}
                      onHover={setHoveredTweet}
                      onLeave={() => setHoveredTweet(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, rgba(191, 191, 191, 0.3) 35%, rgba(191, 191, 191, 0.7) 60%, rgba(191, 191, 191, 1) 80%)`,
            opacity: hasGallery(currentSection?.id) ? 0.3 : 1
          }}
        />

        {/* Top gradient — diffuse */}
        <div
          className="fixed top-0 left-0 right-0 z-15 pointer-events-none"
          style={{
            height: '180px',
            background: 'linear-gradient(to bottom, rgba(191, 191, 191, 1) 0%, rgba(191, 191, 191, 0.6) 30%, rgba(191, 191, 191, 0.2) 60%, transparent 100%)',
          }}
        />

        {/* Bottom gradient */}
        <div
          className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{
            height: '250px',
            background: 'linear-gradient(to top, rgba(191, 191, 191, 1) 0%, rgba(191, 191, 191, 0.6) 30%, rgba(191, 191, 191, 0.2) 60%, transparent 100%)',
          }}
        />
      </main>
    </>
  );
}
