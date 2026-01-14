import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Pause, Volume2, VolumeX, ChevronDown } from "lucide-react";

const videoSources = [
  {
    url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236f4b6e3d7ef1c0d87e8b567736e57c18b64bb1&profile_id=165&oauth2_token_id=57447761",
    title: "Campus Life at Leading Universities",
    description: "Experience the vibrant campus culture",
  },
  {
    url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236f4b6e3d7ef1c0d87e8b567736e57c18b64bb1&profile_id=165&oauth2_token_id=57447761",
    title: "Success Stories from Our Students", 
    description: "Hear from graduates who achieved their dreams",
  },
  {
    url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236f4b6e3d7ef1c0d87e8b567736e57c18b64bb1&profile_id=165&oauth2_token_id=57447761",
    title: "Global Education Opportunities",
    description: "Discover programs worldwide",
  },
];

export default function VideoHeader() {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    // Auto-advance videos every 30 seconds if playing
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
    setCurrentVideo((prev) => (prev + 1) % videoSources.length);
  };

  const handleVideoSelect = (index: number) => {
    setCurrentVideo(index);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
          <source src={videoSources[currentVideo].url} type="video/mp4" />
          {/* Fallback image */}
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
            }}
          />
        </video>
        
        {/* Video overlay */}
        <div className="video-overlay"></div>
      </div>

      {/* Video Controls */}
      <div className="absolute bottom-6 left-6 flex items-center space-x-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-mtendere-orange hover:bg-white/20"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-mtendere-orange hover:bg-white/20"
          onClick={handleMuteToggle}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <div className="text-white text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Video Progress */}
        <div className="w-32 h-1 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-mtendere-orange transition-all duration-300"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Video Selector */}
      <div className="absolute bottom-6 right-6 flex space-x-2 z-20">
        {videoSources.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentVideo
                ? 'bg-mtendere-orange'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            onClick={() => handleVideoSelect(index)}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="video-content">
        <div className="text-center text-white max-w-4xl mx-auto px-4 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 font-sans">
            Your Gateway to <span className="text-mtendere-orange">Global Education</span>
          </h1>
          <p className="text-xl md:text-2xl mb-4 opacity-90">
            {videoSources[currentVideo].description}
          </p>
          <p className="text-lg md:text-xl mb-8 opacity-80">
            Connecting ambitious students with world-class universities and career opportunities
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600 text-white font-semibold px-8 py-4">
              <Link href="/scholarships">
                Explore Scholarships
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-mtendere-blue font-semibold px-8 py-4">
              <Link href="/jobs">
                Find Jobs
              </Link>
            </Button>
          </div>

          {/* Current Video Info */}
          <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
            <h3 className="font-semibold mb-2">{videoSources[currentVideo].title}</h3>
            <div className="flex items-center justify-between text-sm opacity-80">
              <span>Video {currentVideo + 1} of {videoSources.length}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-mtendere-orange"
                onClick={handleNextVideo}
              >
                Next Video
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce z-20">
        <ChevronDown className="w-8 h-8" />
      </div>
    </section>
  );
}
