import type { ReactNode } from "react";

// Inline link used throughout the about-me story. The overlay container is
// pointer-events-none, so links opt back in.
function L({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto underline decoration-black/30 underline-offset-2 transition-colors hover:decoration-black/80"
    >
      {children}
    </a>
  );
}

export type StorySection = {
  label: string;
  years: string;
  city: string;
  body: ReactNode;
};

// The homepage era texts, blended into one story (oldest → today). Each
// section is an "object" the cloud's annotation system can box and tag.
export const STORY_SECTIONS: StorySection[] = [
  {
    label: "another internet kid",
    years: "2005 – 2007",
    city: "suburbs of paris",
    body: (
      <>
        born and raised in paris, france. i started designing at 16 on a
        cracked version of photoshop cs2 — my first gigs were terrible logos
        &amp; websites for my counter strike friends. aim, msn or mirc: the
        early days of remote work.
      </>
    ),
  },
  {
    label: "lost in the game",
    years: "2007 – 2012",
    city: "paris, france",
    body: (
      <>
        i have a master degree in finance and never studied design at school.
        during college i created a bunch of{" "}
        <L href="https://www.konbini.com/fr/3-0/un-tumblr-histoire-internet-picasso-jay-z">
          tumblrs
        </L>
        , curated a newsletter of torrent links, made merch for several french
        colleges, interned at leetchi and built my first social app.
      </>
    ),
  },
  {
    label: "hustling for fun",
    years: "2012 – 2014",
    city: "paris, france",
    body: (
      <>
        then came the side projects — an{" "}
        <L href="https://www.instagram.com/balencyoga/">ironic fan brand</L>{" "}
        inspired by balenciaga, the missing{" "}
        <L href="https://www.producthunt.com/posts/snapchatters">
          &quot;explore&quot; section
        </L>{" "}
        of snapchat,{" "}
        <L href="https://twitter.com/laurentdelrey/status/1009135685960232961">
          collectible cards
        </L>{" "}
        on the ethereum network — and the one that blew up the most, a
        controversial email-based app called{" "}
        <L href="https://twitter.com/justleakit">leak</L>.
      </>
    ),
  },
  {
    label: "a quest called tribe",
    years: "2015 – 2018",
    city: "san francisco, ca",
    body: (
      <>
        2 continents, 3 cities, 4 houses, 15 people, 4 products, 1 family:
        tribe was a series of social experiments backed by{" "}
        <L href="https://www.sequoiacap.com/#">sequoia capital</L> and{" "}
        <L href="https://www.kleinerperkins.com/">kpcb</L> — a{" "}
        <L href="https://www.producthunt.com/posts/tribe-2-0">messaging app</L>
        , a{" "}
        <L href="https://www.producthunt.com/posts/tribe-calls">calling app</L>{" "}
        and a{" "}
        <L href="https://www.producthunt.com/posts/tribe-games">gaming app</L>.
      </>
    ),
  },
  {
    label: "snap, inc.",
    years: "2018 – 2023",
    city: "venice, ca",
    body: (
      <>
        i then joined the core product design team at{" "}
        <L href="https://www.snap.com/">snapchat</L>, a small pioneer group of
        inventors who disrupted the space, honored to contribute to chat,
        calling, minis and the camera.
      </>
    ),
  },
  {
    label: "free ideas",
    years: "2023 – 2024",
    city: "santa monica, ca",
    body: (
      <>
        on apr 1 2021 i started sharing{" "}
        <L href="https://twitter.com/laurentdelrey">free ideas</L> organically
        on twitter/x — the first was an april fool and i kept going, using
        interface elements and internet brands to express my emotions and
        ideas.
      </>
    ),
  },
  {
    label: "meta",
    years: "2025 – ???",
    city: "menlo park, ca",
    body: (
      <>
        i joined meta to slide back into designing social products: after a
        year tinkering with internal and external models in the{" "}
        <L href="https://www.meta.com/superintelligence/">
          superintelligent lab
        </L>
        , i joined <L href="https://www.instagram.com">instagram</L> to focus
        on <L href="https://www.threads.net/@laurentdelrey">threads</L>. today
        i&apos;m a designer living in los angeles, ca — designing different
        types of things for the internet, from tiny controversial experiments
        to larger-scale consumer products.
      </>
    ),
  },
  {
    label: "got out there",
    years: "2014 – 2017",
    city: "the internet",
    body: (
      <>
        some of it got out there — fast company, apple, google, time,{" "}
        <L href="https://techcrunch.com/2016/10/12/augmented-chat/">
          techcrunch
        </L>
        , <L href="https://www.youtube.com/watch?v=EnwRu20HOTQ">complex</L>,{" "}
        <L href="https://twitter.com/MarxMedia/status/497380416501084160">
          bbc
        </L>
        ,{" "}
        <L href="https://motherboard.vice.com/en_us/article/qkvjjq/why-anonymous-messaging-services-are-full-of-bitching-and-flirting">
          vice
        </L>
        ,{" "}
        <L href="https://thenextweb.com/socialmedia/2014/07/28/leak-lets-send-nearly-anonymous-emails-friends-family-enemies/">
          the next web
        </L>
        ,{" "}
        <L href="https://www.vogue.ru/fashion/news/balencyoga_gibkiy_otvet_balenciaga/">
          vogue
        </L>
        ,{" "}
        <L href="https://hypebeast.kr/2017/7/balencyoga-balenciaga-parody-collection">
          hypebeast
        </L>
        ,{" "}
        <L href="https://www.washingtonpost.com/news/the-intersect/wp/2014/07/29/a-new-app-will-let-you-send-anonymous-e-mail-to-anyone-which-sounds-like-a-disaster-waiting-to-happen/">
          the washington post
        </L>{" "}
        and{" "}
        <L href="http://mashable.com/2014/08/04/leak-anonymous-email/">
          mashable
        </L>
        .
      </>
    ),
  },
];
