import { useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5102";
const ARCHIVE_METADATA_BASE = "https://archive.org/metadata/";

function getYouTubeId(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}

function getArchiveIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const detailsIndex = pathParts.findIndex((part) => part === "details" || part === "embed");
    if (detailsIndex >= 0 && pathParts[detailsIndex + 1]) {
      return pathParts[detailsIndex + 1];
    }

    const downloadIndex = pathParts.findIndex((part) => part === "download");
    if (downloadIndex >= 0 && pathParts[downloadIndex + 1]) {
      return pathParts[downloadIndex + 1];
    }
  } catch {
    // Not a full URL.
  }

  const detailsMatch = raw.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);
  if (detailsMatch?.[1]) return detailsMatch[1];

  const downloadMatch = raw.match(/archive\.org\/download\/([^/?#]+)/i);
  if (downloadMatch?.[1]) return downloadMatch[1];

  return "";
}

function getGoogleDriveFileId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directId = raw.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (directId) return raw;

  const fallbackMatch = raw.match(/(?:\/file\/d\/|\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (fallbackMatch?.[1]) return fallbackMatch[1];

  try {
    const url = new URL(raw);
    if (!url.hostname.includes("drive.google.com") && !url.hostname.includes("googleusercontent.com")) return "";
    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (filePathMatch?.[1]) return filePathMatch[1];
    return url.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function isArchiveUrl(value) {
  return /archive\.org/i.test(String(value || ""));
}

function normalizeArchiveFileUrl(identifier, fileName) {
  const cleanIdentifier = encodeURIComponent(identifier);
  const cleanFileName = fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://archive.org/download/${cleanIdentifier}/${cleanFileName}`;
}

function pickArchiveVideoFile(files = []) {
  const normalized = files
    .map((file) => {
      const name = String(file?.name || "").trim();
      const format = String(file?.format || "").trim().toLowerCase();
      const size = Number(file?.size || 0);
      return { file, name, format, size };
    })
    .filter(({ name }) => Boolean(name));

  const preferred = [
    (item) => item.name.toLowerCase().endsWith(".mp4"),
    (item) => item.format.includes("mpeg4") || item.format.includes("mp4"),
    (item) => item.format.includes("webm"),
    (item) => item.format.includes("h.264"),
    (item) => item.format.includes("h264"),
    (item) => item.format.includes("matroska"),
  ];

  for (const matcher of preferred) {
    const found = normalized.find(matcher);
    if (found) return found.name;
  }

  const videoLike = normalized.find((item) => item.format.startsWith("video/"));
  if (videoLike) return videoLike.name;

  const largest = normalized
    .filter((item) => /\.(mp4|webm|mkv|mov|m4v)$/i.test(item.name))
    .sort((a, b) => b.size - a.size)[0];
  return largest?.name || "";
}

async function resolveArchiveSource(value) {
  const raw = String(value || "").trim();
  const identifier = getArchiveIdentifier(raw);

  if (!identifier) {
    return { kind: "direct", value: raw };
  }

  const directDownloadMatch = raw.match(/archive\.org\/download\/[^/?#]+\/([^?#]+)/i);
  if (directDownloadMatch?.[1] && /\.(mp4|webm|m4v|mov|mkv)$/i.test(directDownloadMatch[1])) {
    return { kind: "direct", value: raw };
  }

  const backendResolveUrl = `${API_BASE_URL}/api/archive/resolve?url=${encodeURIComponent(raw)}`;
  try {
    const backendResponse = await fetch(backendResolveUrl, {
      headers: { Accept: "application/json" },
    });

    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      if (backendData?.directUrl) {
        return { kind: "direct", value: backendData.directUrl };
      }
    }
  } catch {
    // Ignore backend fallback failures and try Archive.org directly.
  }

  const metadataUrl = `${ARCHIVE_METADATA_BASE}${encodeURIComponent(identifier)}`;
  const response = await fetch(metadataUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Archive metadata request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const fileName = pickArchiveVideoFile(data?.files || []);
  if (!fileName) {
    throw new Error("Archive item does not contain a playable video file.");
  }

  return {
    kind: "direct",
    value: normalizeArchiveFileUrl(identifier, fileName),
  };
}

async function resolveGoogleDriveSource(value, { courseId, token } = {}) {
  const raw = String(value || "").trim();
  const fileId = getGoogleDriveFileId(raw);

  if (!fileId) {
    return { kind: "direct", value: raw };
  }

  if (courseId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lessons/stream/${encodeURIComponent(fileId)}?courseId=${encodeURIComponent(courseId)}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.streamUrl) {
          return { kind: "direct", value: data.streamUrl };
        }
      }
    } catch {
      // Fall back to the anonymous proxy below.
    }
  }

  return {
    kind: "direct",
    value: `${API_BASE_URL}/api/lessons/video-proxy/${encodeURIComponent(fileId)}`,
  };
}

async function resolveSource(src, type, options = {}) {
  const raw = String(src || "").trim();
  if (!raw) return { kind: "empty", value: "" };

  const youtubeId = type === "youtube" ? getYouTubeId(raw) || raw : getYouTubeId(raw);
  if (youtubeId) return { kind: "youtube", value: youtubeId };

  if (isArchiveUrl(raw)) {
    return resolveArchiveSource(raw);
  }

  const driveId = getGoogleDriveFileId(raw);
  if (driveId || /drive\.google\.com|googleusercontent\.com/i.test(raw)) {
    return resolveGoogleDriveSource(raw, options);
  }

  const absolute = raw.startsWith("http") ? raw : `${API_BASE_URL}${raw}`;
  return { kind: "direct", value: absolute };
}

export default function UniversalVideoPlayer({ src, type = "auto", title, studentId, courseId, token, onEnded }) {
  const videoRef = useRef(null);
  const embedRef = useRef(null);
  const playerRef = useRef(null);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState({ kind: "empty", value: "" });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      setError("");
      try {
        const nextResolved = await resolveSource(src, type, { courseId, token });
        if (active) {
          setResolved(nextResolved);
        }
      } catch (resolveError) {
        if (active) {
          setResolved({ kind: "error", value: "" });
          setError(resolveError?.message || "Failed to resolve playable video source.");
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [src, type, courseId, token]);

  useEffect(() => {
    setError("");
    const element = resolved.kind === "youtube" ? embedRef.current : videoRef.current;
    if (!element || (resolved.kind !== "direct" && resolved.kind !== "youtube") || !resolved.value) return undefined;

    try {
      if (resolved.kind === "direct" && element.tagName === "VIDEO") {
        element.src = resolved.value;
        element.preload = "metadata";
      } else if (resolved.kind === "youtube") {
        element.dataset.plyrProvider = "youtube";
        element.dataset.plyrEmbedId = resolved.value;
      }

      const player = new Plyr(element, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
        settings: ["speed", "quality"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        youtube: {
          noCookie: true,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
      });

      if (onEnded) {
        player.on("ended", onEnded);
      }
      player.on("enterfullscreen", () => setIsFullscreen(true));
      player.on("exitfullscreen", () => setIsFullscreen(false));

      playerRef.current = player;

      return () => {
        try {
          player.destroy();
        } catch (destroyError) {
          console.warn("[UniversalVideoPlayer] destroy failed:", destroyError);
        }
        playerRef.current = null;
        setIsFullscreen(false);
      };
    } catch (initError) {
      console.error("[UniversalVideoPlayer] init failed:", initError);
      setError(initError?.message || "Failed to initialize player.");
      return undefined;
    }
  }, [resolved.kind, resolved.value, onEnded]);

  if (!src) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-center text-slate-400">
        <p className="font-bold">لا يوجد فيديو متاح لهذه المحاضرة.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-red-500/30 bg-slate-950 p-8 text-center text-white">
        <p className="text-sm font-bold text-red-400">تعذر تشغيل الفيديو</p>
        <p className="max-w-xl break-all text-[11px] text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[1.75rem] bg-black shadow-2xl">
      <div className="relative aspect-video w-full">
        {resolved.kind === "youtube" ? (
          <>
            <div
              ref={embedRef}
              className="plyr__video-embed h-full w-full"
              data-plyr-provider="youtube"
              data-plyr-embed-id={resolved.value}
              title={title || "YouTube video"}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-auto cursor-default bg-gradient-to-b from-black/85 via-black/40 to-transparent ${
                isFullscreen ? "fixed left-0 right-0 top-0 z-[9999] h-24" : "absolute inset-x-0 top-0 z-[55] h-16"
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            />
          </>
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            playsInline
            preload="metadata"
          />
        )}
      </div>
      {title && (
        <div className="border-t border-white/10 bg-black/40 px-4 py-2 text-right text-[11px] font-bold text-white/70">
          {title}
        </div>
      )}
    </div>
  );
}
