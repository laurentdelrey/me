"use client";

type MediaItem = {
  type: string;
  localFile: string;
  width: number;
  height: number;
  durationMs?: number;
  blobUrl?: string;
};

export type Tweet = {
  id: string;
  date: string;
  text: string;
  media: MediaItem[];
  favoriteCount: number;
  retweetCount: number;
  replies?: string[];
  hidden?: boolean;
};

function GalleryCard({
  tweet,
  onMouseEnter,
  onMouseLeave,
}: {
  tweet: Tweet;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const firstMedia = tweet.media[0];
  if (!firstMedia?.blobUrl) return null;

  const isVideo = firstMedia.type === "video";

  return (
    <a
      href={`https://x.com/laurentdelrey/status/${tweet.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="gallery-card block overflow-hidden"
      data-no-cursor-expand
      data-tweet-id={tweet.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isVideo ? (
        <video
          src={firstMedia.blobUrl}
          muted
          loop
          autoPlay
          playsInline
          className="w-full h-auto object-cover block"
        />
      ) : (
        <img
          src={firstMedia.blobUrl}
          alt={tweet.text}
          loading="lazy"
          className="w-full h-auto object-cover block"
        />
      )}
    </a>
  );
}

export default function EraGallery({
  tweets,
  onHover,
  onLeave,
}: {
  tweets: Tweet[];
  label?: string;
  onHover: (tweet: Tweet) => void;
  onLeave: () => void;
}) {
  if (tweets.length === 0) return null;

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* 2-column masonry grid */}
      <div style={{ display: "flex", gap: "0px" }} className="era-gallery-grid">
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, minWidth: 0 }}>
            {tweets
              .filter((_, i) => i % 2 === col)
              .map((tweet) => (
                <GalleryCard
                  key={tweet.id}
                  tweet={tweet}
                  onMouseEnter={() => onHover(tweet)}
                  onMouseLeave={onLeave}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
