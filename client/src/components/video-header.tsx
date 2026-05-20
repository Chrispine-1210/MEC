import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, ExternalLink, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import type { ApiPartnerVideo } from "@/lib/api-types";

const isDirectVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

const getYouTubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/").filter(Boolean)[1] || null;
      }

      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/").filter(Boolean)[1] || null;
      }

      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
};

const buildEmbedUrl = (url: string, shouldAutoplay: boolean) => {
  const youtubeId = getYouTubeId(url);
  if (!youtubeId) return null;

  const params = new URLSearchParams({
    autoplay: shouldAutoplay ? "1" : "0",
    mute: "1",
    controls: "0",
    disablekb: "1",
    enablejsapi: "1",
    loop: "1",
    playlist: youtubeId,
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
};

export default function VideoHeader() {
  const { data: partnerVideos = [] } = useQuery<ApiPartnerVideo[]>({
    queryKey: ["/api/partner-videos"],
    ...publicContentQueryOptions,
  });

  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = partnerVideos[currentVideo] ?? null;
  const directVideo = current && isDirectVideoUrl(current.videoUrl) ? current.videoUrl : null;
  const embedUrl = current && !directVideo ? buildEmbedUrl(current.videoUrl, isPlaying) : null;
  const hasVideos = partnerVideos.length > 0;

  useEffect(() => {
    if (currentVideo >= partnerVideos.length) {
      setCurrentVideo(0);
    }
  }, [currentVideo, partnerVideos.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !directVideo) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("ended", handleNextVideo);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("ended", handleNextVideo);
    };
  }, [currentVideo, directVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !directVideo) return;

    if (isPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [directVideo, isPlaying, currentVideo]);

  useEffect(() => {
    if (!isPlaying || partnerVideos.length < 2) return;

    const interval = window.setInterval(() => {
      handleNextVideo();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isPlaying, currentVideo, partnerVideos.length]);

  const fallbackBackground = useMemo(
    () =>
      getGovernedBackgroundImage({
        module: "program",
        title: current?.partnerName || "Mtendere global education",
        category: current?.country || "education",
        variant: "hero",
      }),
    [current?.country, current?.partnerName],
  );

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || !directVideo) {
      setIsPlaying((value) => !value);
      return;
    }

    if (isPlaying) {
      video.pause();
    } else {
      void video.play();
    }

    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  function handleNextVideo() {
    if (partnerVideos.length < 2) return;

    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentVideo((prev) => (prev + 1) % partnerVideos.length);
      setCurrentTime(0);
      setDuration(0);
      setIsTransitioning(false);
    }, 300);
  }

  const handleVideoSelect = (index: number) => {
    if (index === currentVideo) return;

    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentVideo(index);
      setCurrentTime(0);
      setDuration(0);
      setIsTransitioning(false);
    }, 300);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <section className="video-header">
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        {directVideo ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay={isPlaying}
            muted={isMuted}
            loop={partnerVideos.length < 2}
            playsInline
            key={directVideo}
          >
            <source src={directVideo} />
          </video>
        ) : embedUrl ? (
          <iframe
            key={embedUrl}
            title={current?.title || "Partner university video"}
            src={embedUrl}
            className="h-full w-full scale-125 border-0 object-cover md:scale-110"
            loading="eager"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: fallbackBackground }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
      </div>

      <div className="absolute bottom-6 left-6 z-20 flex items-center space-x-3">
        {hasVideos && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-card/20 hover:text-mtendere-orange"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause hero video rotation" : "Play hero video rotation"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {directVideo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-card/20 hover:text-mtendere-orange"
                onClick={handleMuteToggle}
                aria-label={isMuted ? "Unmute hero video" : "Mute hero video"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            )}

            {directVideo && (
              <>
                <div className="font-mono text-xs text-white/70">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-card/30">
                  <div
                    className="h-full bg-mtendere-orange transition-all duration-300"
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {partnerVideos.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex space-x-2">
          {partnerVideos.map((video, index) => (
            <button
              key={`${video.partnerId}-${video.videoUrl}`}
              aria-label={`Show ${video.partnerName} video`}
              className={`rounded-full transition-all duration-300 ${
                index === currentVideo
                  ? "h-3 w-8 bg-mtendere-orange"
                  : "h-3 w-3 bg-card/50 hover:bg-card/80"
              }`}
              onClick={() => handleVideoSelect(index)}
            />
          ))}
        </div>
      )}

      <div className="video-content">
        <div
          className={`mx-auto max-w-5xl px-6 text-center text-white transition-opacity duration-300 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-card/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mtendere-orange" />
            {current?.country || "Global partner network"}
          </div>

          <p className="mb-3 text-base font-bold uppercase tracking-[0.25em] text-mtendere-orange drop-shadow md:text-lg">
            {current?.partnerName || "Mtendere Education Consult"}
          </p>

          <h1 className="mb-5 text-4xl font-black leading-tight drop-shadow-lg md:text-6xl lg:text-7xl">
            {current?.title || "Your Gateway to "}
            {!current && <span className="text-mtendere-orange">Global Education</span>}
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg font-medium leading-relaxed text-white/90 drop-shadow md:text-xl">
            {current?.description ||
              "We connect ambitious students with administered partner institutions, scholarships, jobs, and career pathways from one governed platform."}
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-mtendere-orange px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:bg-mtendere-orange/90 hover:shadow-mtendere-orange/30"
            >
              <Link href={current ? `/partners/${current.partnerId}` : "/partners"}>
                View Partner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="border-2 border-white bg-card/15 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-card hover:text-mtendere-blue"
            >
              {current?.website ? (
                <a href={current.website} target="_blank" rel="noopener noreferrer">
                  Official Website
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ) : (
                <Link href="/contact">Book a Free Consultation</Link>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 z-20 hidden -translate-x-1/2 animate-bounce text-white/60 md:block">
        <ChevronDown className="h-7 w-7" />
      </div>
    </section>
  );
}
