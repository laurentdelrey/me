// The homepage era texts, blended into one story (oldest → today), as plain
// text runs so the about page can lay them out with pretext and animate the
// re-wrap word by word. A run with an href renders as a link.
export type StoryRun = { t: string; href?: string };

export type StorySection = {
  label: string;
  years: string;
  city: string;
  runs: StoryRun[];
};

export const STORY_SECTIONS: StorySection[] = [
  {
    label: "another internet kid",
    years: "2005 – 2007",
    city: "suburbs of paris",
    runs: [
      {
        t: "born and raised in paris, france. i started designing at 16 on a cracked version of photoshop cs2. my first gigs were terrible logos & websites for my counter strike friends. aim, msn or mirc: the early days of remote work.",
      },
    ],
  },
  {
    label: "lost in the game",
    years: "2007 – 2012",
    city: "paris, france",
    runs: [
      { t: "i have a master degree in finance and never studied design at school. during college i created a bunch of " },
      {
        t: "tumblrs",
        href: "https://www.konbini.com/fr/3-0/un-tumblr-histoire-internet-picasso-jay-z",
      },
      {
        t: ", curated a newsletter of torrent links, made merch for several french colleges, interned at leetchi and built my first social app.",
      },
    ],
  },
  {
    label: "hustling for fun",
    years: "2012 – 2014",
    city: "paris, france",
    runs: [
      { t: "a stretch of side projects: an " },
      { t: "ironic fan brand", href: "https://www.instagram.com/balencyoga/" },
      { t: " inspired by balenciaga, the missing " },
      {
        t: '"explore" section',
        href: "https://www.producthunt.com/posts/snapchatters",
      },
      { t: " of snapchat, " },
      {
        t: "collectible cards",
        href: "https://twitter.com/laurentdelrey/status/1009135685960232961",
      },
      {
        t: " on the ethereum network, and the one that blew up the most, a controversial email-based app called ",
      },
      { t: "leak", href: "https://twitter.com/justleakit" },
      { t: ". covered by " },
      {
        t: "the washington post",
        href: "https://www.washingtonpost.com/news/the-intersect/wp/2014/07/29/a-new-app-will-let-you-send-anonymous-e-mail-to-anyone-which-sounds-like-a-disaster-waiting-to-happen/",
      },
      { t: ", " },
      { t: "bbc", href: "https://twitter.com/MarxMedia/status/497380416501084160" },
      { t: ", " },
      {
        t: "vice",
        href: "https://motherboard.vice.com/en_us/article/qkvjjq/why-anonymous-messaging-services-are-full-of-bitching-and-flirting",
      },
      { t: ", " },
      {
        t: "the next web",
        href: "https://thenextweb.com/socialmedia/2014/07/28/leak-lets-send-nearly-anonymous-emails-friends-family-enemies/",
      },
      { t: ", " },
      { t: "mashable", href: "http://mashable.com/2014/08/04/leak-anonymous-email/" },
      { t: ", " },
      {
        t: "vogue",
        href: "https://www.vogue.ru/fashion/news/balencyoga_gibkiy_otvet_balenciaga/",
      },
      { t: " and " },
      {
        t: "hypebeast",
        href: "https://hypebeast.kr/2017/7/balencyoga-balenciaga-parody-collection",
      },
      { t: "." },
    ],
  },
  {
    label: "a quest called tribe",
    years: "2015 – 2018",
    city: "san francisco, ca",
    runs: [
      {
        t: "2 continents, 3 cities, 4 houses, 15 people, 4 products, 1 family: tribe was a series of social experiments backed by ",
      },
      { t: "sequoia capital", href: "https://www.sequoiacap.com/#" },
      { t: " and " },
      { t: "kpcb", href: "https://www.kleinerperkins.com/" },
      { t: ": a " },
      { t: "messaging app", href: "https://www.producthunt.com/posts/tribe-2-0" },
      { t: ", a " },
      { t: "calling app", href: "https://www.producthunt.com/posts/tribe-calls" },
      { t: " and a " },
      { t: "gaming app", href: "https://www.producthunt.com/posts/tribe-games" },
      { t: ". featured by " },
      { t: "techcrunch", href: "https://techcrunch.com/2016/10/12/augmented-chat/" },
      { t: " and " },
      { t: "complex", href: "https://www.youtube.com/watch?v=EnwRu20HOTQ" },
      { t: ", recognized by apple, google, fast company and time." },
    ],
  },
  {
    label: "snap, inc.",
    years: "2018 – 2023",
    city: "venice, ca",
    runs: [
      { t: "i was part of the core product design team at " },
      { t: "snapchat", href: "https://www.snap.com/" },
      {
        t: ", a small pioneer group of inventors who disrupted the space. i focused on the core experience, snapping and chatting, and also worked on calling, minis and the camera.",
      },
    ],
  },
  {
    label: "free ideas",
    years: "2023 – 2024",
    city: "santa monica, ca",
    runs: [
      { t: "on apr 1 2021 i started sharing " },
      { t: "free ideas", href: "https://twitter.com/laurentdelrey" },
      {
        t: " organically on twitter/x. the first was an april fool and i kept going, using interface elements and internet brands to express my emotions and ideas.",
      },
    ],
  },
  {
    label: "meta",
    years: "2025 – ???",
    city: "menlo park, ca",
    runs: [
      {
        t: "i joined meta to slide back into designing social products. after a year tinkering with internal and external models in the ",
      },
      {
        t: "superintelligent lab",
        href: "https://www.meta.com/superintelligence/",
      },
      { t: ", i joined " },
      { t: "instagram", href: "https://www.instagram.com" },
      { t: " to focus on " },
      { t: "threads", href: "https://www.threads.net/@laurentdelrey" },
      { t: "." },
    ],
  },
  {
    label: "today",
    years: "2026",
    city: "los angeles, ca",
    runs: [
      {
        t: "i'm a designer living in los angeles, ca, designing different types of things for the internet, from tiny controversial experiments to larger-scale consumer products.",
      },
    ],
  },
];
