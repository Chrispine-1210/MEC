import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Pause, Volume2, VolumeX, ChevronDown, ArrowRight } from "lucide-react";
import { getGovernedBackgroundImage } from "@/lib/image-governance";

const videoSources = [
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-group-of-students-working-in-a-university-library-40040-large.mp4",
    headline: "Your Gateway to",
    highlight: "Global Education",
    caption: "We connect ambitious Malawian students with world-class universities, fully-funded scholarships, and life-changing career opportunities across 50+ countries.",
    badge: "Trusted by 10,000+ Students",
  },
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-students-walking-on-a-university-campus-40038-large.mp4",
    headline: "Access Over",
    highlight: "200+ Top Universities",
    caption: "From Oxford to MIT, our expert consultants help you apply, prepare, and succeed at the world's most prestigious institutions.",
    badge: "200+ Partner Universities",
  },
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-a-laptop-in-a-library-40041-large.mp4",
    headline: "Scholarships,",
    highlight: "Careers & Beyond",
    caption: "Study abroad, secure scholarships, build a winning CV, and launch your career - all with personalised guidance from our Malawi-based team.",
    badge: "50+ Countries - 10K+ Students Helped",
  },
];

export default function VideoHeader() {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleNextVideo);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleNextVideo);
    };
  }, [currentVideo]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        handleNextVideo();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentVideo]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleNextVideo = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentVideo((prev) => (prev + 1) % videoSources.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handleVideoSelect = (index: number) => {
    if (index === currentVideo) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentVideo(index);
      setIsTransitioning(false);
    }, 300);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const current = videoSources[currentVideo];

  return (
    <section className="video-header">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={isMuted}
          loop={false}
          playsInline
          key={currentVideo}
        >
          <source src={current.url} type="video/mp4" />
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: getGovernedBackgroundImage({
                module: "program",
                title: "Mtendere global education",
                category: "education",
                variant: "hero",
              })
            }}
          />
        </video>

      {/* Gradient overlay - darker at bottom for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
    </div>

      {/* Video Controls - bottom left */}
      <div className="absolute bottom-6 left-6 flex items-center space-x-3 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-mtendere-orange hover:bg-card/20 h-8 w-8"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-mtendere-orange hover:bg-card/20 h-8 w-8"
          onClick={handleMuteToggle}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>

        <div className="text-white/70 text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="w-24 h-1 bg-card/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-mtendere-orange transition-all duration-300"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Slide Dots - bottom right */}
      <div className="absolute bottom-6 right-6 flex space-x-2 z-20">
        {videoSources.map((_, index) => (
          <button
            key={index}
            aria-label={`Slide ${index + 1}`}
            className={`transition-all duration-300 rounded-full ${
              index === currentVideo
                ? 'bg-mtendere-orange w-8 h-3'
                : 'bg-card/50 hover:bg-card/80 w-3 h-3'
            }`}
            onClick={() => handleVideoSelect(index)}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="video-content">
        <div
          className={`text-center text-white max-w-5xl mx-auto px-6 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Top badge */}
          <div className="inline-flex items-center gap-2 bg-card/15 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-mtendere-orange animate-pulse" />
            {current.badge}
          </div>

          {/* Company name caption */}
          <p className="text-base md:text-lg font-bold tracking-[0.25em] text-mtendere-orange uppercase mb-3 drop-shadow">
            Mtendere Education Consult
          </p>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-5 leading-tight drop-shadow-lg">
            {current.headline}{" "}
            <span className="text-mtendere-orange">{current.highlight}</span>
          </h1>

          {/* Sub-caption */}
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow">
            {current.caption}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-mtendere-orange hover:bg-mtendere-orange/90 text-white font-bold px-8 py-4 text-base shadow-xl hover:shadow-mtendere-orange/30 transition-all"
            >
              <Link href="/scholarships">
                Explore Scholarships
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-card/15 backdrop-blur-sm border-2 border-white text-white hover:bg-card hover:text-mtendere-blue font-bold px-8 py-4 text-base transition-all"
            >
              <Link href="/contact">
                Book a Free Consultation
              </Link>
            </Button>
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { value: "10K+", label: "Students Helped" },
              { value: "200+", label: "Universities" },
              { value: "50+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-mtendere-orange">{stat.value}</div>
                <div className="text-xs md:text-sm text-white/80 font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 animate-bounce z-20 hidden md:block">
        <ChevronDown className="w-7 h-7" />
      </div>
    </section>
  );
}


