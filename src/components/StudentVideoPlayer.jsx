import React from "react";
import { Lock } from "lucide-react";
import UniversalVideoPlayer from "./UniversalVideoPlayer.jsx";
import PlayerErrorBoundary from "./PlayerErrorBoundary.jsx";

export default function StudentVideoPlayer({
  fileId,
  youtubeVideoId,
  courseId,
  videoUrl,
  studentId,
  token,
  onEnded,
  hasAccess = true,
  isFree = false,
  isTeacher = false,
}) {
  if (!hasAccess && !isFree && !isTeacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-slate-950 text-white rounded-3xl space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <Lock size={30} />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">هذا الفيديو محمي ومخصص للمشتركين فقط</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            يرجى الاشتراك في الكورس وتفعيله لتتمكن من تشغيل هذا المحتوى ومتابعته.
          </p>
        </div>
      </div>
    );
  }

  const src = videoUrl || (youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : fileId);

  return (
    <PlayerErrorBoundary>
      <UniversalVideoPlayer
        src={src}
        videoId={fileId}
        token={token}
        courseId={courseId}
        studentId={studentId}
        onEnded={onEnded}
      />
    </PlayerErrorBoundary>
  );
}
