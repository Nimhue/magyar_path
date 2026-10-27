/**
 * Embedded YouTube player (privacy-enhanced youtube-nocookie.com) using the official IFrame API.
 * It checks the video's real title and channel once loaded, so a link that starts pointing
 * somewhere else is flagged instead of silently showing the wrong video.
 */
import { useEffect, useRef, useState } from "react";

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(s: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(o: {
    videoId: string;
    startSeconds?: number;
    endSeconds?: number;
  }): void;
  getVideoData?(): { title?: string; author?: string; video_id?: string };
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube couldn't load"));
      };
      document.head.appendChild(s);
    });
  return apiPromise;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Official channels for Magyar népmesék (Hungarian original and English dub). */
const OFFICIAL = ["kecskemetfilm", "hungarian folk tales"];

export type PlayerApi = YTPlayer;

export function YouTubePlayer({
  videoId,
  expectedTitle,
  start,
  end,
  captions,
  onApi,
  onEnd,
}: {
  videoId: string;
  expectedTitle?: string;
  start?: number;
  end?: number;
  /** ask YouTube to show subtitles in this language if the video has them */
  captions?: "hu" | "en";
  onApi?: (p: PlayerApi | null) => void;
  onEnd?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "gone">(
    "loading",
  );
  const [mismatch, setMismatch] = useState<string | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    let player: YTPlayer | null = null;
    let cancelled = false;
    setState("loading");
    setMismatch(null);
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    loadApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const el = document.createElement("div");
        host.current.replaceChildren(el);
        player = new YT.Player(el, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            hl: captions ?? "hu",
            ...(start !== undefined ? { start: Math.floor(start) } : {}),
            ...(end !== undefined ? { end: Math.ceil(end) } : {}),
            ...(captions ? { cc_load_policy: 1, cc_lang_pref: captions } : {}),
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setState("ready");
              onApi?.(player);
              const d = player?.getVideoData?.();
              if (d?.title && expectedTitle) {
                const okTitle =
                  norm(d.title).includes(norm(expectedTitle)) ||
                  norm(expectedTitle).includes(norm(d.title));
                const okAuthor =
                  !d.author ||
                  OFFICIAL.some((o) => norm(d.author!).includes(o));
                if (!okTitle || !okAuthor)
                  setMismatch(`${d.title}${d.author ? ` · ${d.author}` : ""}`);
              }
            },
            onError: () => !cancelled && setState("gone"),
            onStateChange: (e: { data: number }) => {
              if (e.data === 0) onEndRef.current?.();
            },
          },
        });
      })
      .catch(() => !cancelled && setState("offline"));
    return () => {
      cancelled = true;
      onApi?.(null);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, start, end, captions]);

  return (
    <div className="yt-wrap">
      <div className="yt-box">
        <div className="yt-frame" ref={host} />
        {state === "loading" && (
          <div className="yt-msg">Loading the video…</div>
        )}
        {state === "offline" && (
          <div className="yt-msg">
            The video needs an internet connection.{" "}
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open on YouTube
            </a>
          </div>
        )}
        {state === "gone" && (
          <div className="yt-msg">
            This video isn't available any more.{" "}
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(expectedTitle ?? "Magyar népmesék")}`}
              target="_blank"
              rel="noreferrer"
            >
              Search for it on YouTube
            </a>
          </div>
        )}
      </div>
      {mismatch && (
        <p className="yt-warn" role="status">
          Heads-up: this link now shows “{mismatch}”, not the episode we
          expected. Tell whoever runs the site so they can update it.
        </p>
      )}
    </div>
  );
}
