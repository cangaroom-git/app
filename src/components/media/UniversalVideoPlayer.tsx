"use client";

import React, { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { parseVideoSource } from "@/lib/mediaUtils";

export interface UniversalVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  aspectRatio?: "9/16" | "16/9";
  fitMode?: "cover" | "contain";
  autoPlay?: boolean;
  initialMuted?: boolean;
  className?: string;
}

/**
 * Renders YouTube, YouTube Shorts, Facebook Reels/Video, or direct MP4 URLs.
 * Supports `fitMode="contain"` for true uncropped aspect ratio inside Pin Close-Up.
 */
export function UniversalVideoPlayer({
  videoUrl,
  posterUrl,
  title = "Video player",
  aspectRatio = "9/16",
  fitMode = "cover",
  autoPlay = true,
  initialMuted = false,
  className = "",
}: UniversalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingMp4, setIsPlayingMp4] = useState(autoPlay);
  const [isMutedMp4, setIsMutedMp4] = useState(initialMuted);

  const parsed = parseVideoSource(videoUrl, {
    autoplay: autoPlay,
    muted: initialMuted,
    forceVertical: aspectRatio === "9/16",
  });

  const aspectClass =
    fitMode === "contain"
      ? "h-full max-h-[78vh] lg:max-h-full"
      : aspectRatio === "9/16"
      ? "aspect-[9/16]"
      : "aspect-[16/9]";

  const surfaceBgClass =
    fitMode === "contain"
      ? "bg-[var(--color-background-body)] text-[var(--color-text-secondary)]"
      : "bg-black text-white/70";

  if (!videoUrl.trim()) {
    return (
      <div
        className={`relative w-full ${aspectClass} ${surfaceBgClass} flex items-center justify-center ty-caption ${className}`}
      >
        ยังไม่ได้ใส่ลิงก์วิดีโอ
      </div>
    );
  }

  if (parsed.provider === "youtube" || parsed.provider === "facebook") {
    return (
      <div
        className={`relative w-full ${
          fitMode === "contain"
            ? aspectRatio === "9/16"
              ? "h-full max-w-[440px] mx-auto"
              : "aspect-[16/9] my-auto"
            : aspectClass
        } ${fitMode === "contain" ? "bg-[var(--color-background-body)]" : "bg-black"} overflow-hidden ${className}`}
      >
        <iframe
          key={parsed.embedUrl}
          src={parsed.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  const handleTogglePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      setIsPlayingMp4(true);
    } else {
      videoEl.pause();
      setIsPlayingMp4(false);
    }
  };

  return (
    <div
      className={`group relative w-full ${aspectClass} ${
        fitMode === "contain"
          ? "bg-[var(--color-background-body)]"
          : "bg-black"
      } overflow-hidden flex items-center justify-center ${className}`}
    >
      <video
        ref={videoRef}
        key={parsed.embedUrl}
        src={parsed.embedUrl}
        poster={posterUrl}
        autoPlay={autoPlay}
        playsInline
        loop
        muted={isMutedMp4}
        onClick={handleTogglePlay}
        className={`w-full h-full ${
          fitMode === "contain" ? "object-contain" : "object-cover"
        } cursor-pointer`}
      />

      {!isPlayingMp4 && (
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label="Play video"
          className="absolute inset-0 m-auto h-14 w-14 rounded-[18px] bg-black/60 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white ml-0.5" />
        </button>
      )}

      <div className="absolute right-3 bottom-3 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={() => setIsMutedMp4((prev) => !prev)}
          aria-label={isMutedMp4 ? "Unmute" : "Mute"}
          className="h-9 w-9 rounded-[12px] bg-black/55 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
        >
          {isMutedMp4 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlayingMp4 ? "Pause" : "Play"}
          className="h-9 w-9 rounded-[12px] bg-black/55 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
        >
          {isPlayingMp4 ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}
