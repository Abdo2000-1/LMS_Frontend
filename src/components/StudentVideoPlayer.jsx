import React from "react";
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
}) {
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
