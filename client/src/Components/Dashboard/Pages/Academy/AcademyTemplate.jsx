import React, { useState, useEffect, useRef } from "react";
import { NavLink, useParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { useAcademyTemplate } from "./useAcademyTemplate";
import config from "../../../../config";
import "./Academy.css";

const AcademyTemplate = () => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);

  const { slug } = useParams();
  const { academyData, loading, error } = useAcademyTemplate(slug);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handlePlay = () => setIsPaused(false);
    const handlePauseOrEnded = () => setIsPaused(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePauseOrEnded);
    video.addEventListener("ended", handlePauseOrEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePauseOrEnded);
      video.removeEventListener("ended", handlePauseOrEnded);
    };
  }, []);

  const handleThumbnailClick = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        await video.play(); // essaye de jouer la vidéo
        setIsPaused(false); // en même temps, masque la miniature
      } catch (error) {
        console.error("Erreur au démarrage de la vidéo :", error);
      }
    }
  };


  if (!academyData) return null;

  const { info, content } = academyData;
  const categories = content.multiReference?.map(ref => ref.label) || [];
  const videoSource = content.video?.[0]?.src_video;
  const thumbnail = content.image?.[0]?.src_image;
  const description = content.text?.[0]?.text || "";
  const richTextContent = content.richText?.[0]?.text_html || "";

  return (
    <div className="outlet">
      <div className="title_section">
        <div className="breadCrumbs">
          <NavLink
            style={{ color: theme.palette.text.primary }}
            className="breadCrumbsLink"
            to="/dashboard/home"
          >
            Dashboard
          </NavLink>
          ‎ &gt; ‎ 
          <NavLink
            to="/dashboard/academy"
            style={{ color: theme.palette.text.primary }}
            className="breadCrumbsLink"
          >
            Academy
          </NavLink>
        </div>
      </div>

      <div className="academy_section">
        <div className="academy_template_container">
          <h1 className="academy_template_title">{info.page_blog_name}</h1>

          <div className="academy_template_header">
            {categories.map((cat, idx) => (
              <p key={idx} className="academy_categories">{cat}</p>
            ))}
            <div className="academy_template_time">
              <AccessTimeRoundedIcon className="academy_template_time_icon" fontSize="tiny" />
              <span className="academy_template_time_value">{description}</span>
            </div>
          </div>

          <div className="academy_template_content_container">
            <div className="video_container" style={{ position: "relative" }}>
              {/* Thumbnail */}
              {thumbnail && (
                <div
                  className="academy_video_thumbnail_container"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    transition: "opacity 0.4s ease-in-out",
                    opacity: isPaused ? 1 : 0,
                    pointerEvents: isPaused ? "auto" : "none",
                    zIndex: 2,
                    backgroundColor: "black",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={handleThumbnailClick}
                >
                  <img
                    src={`${config.apiUrl}/media/blog/${thumbnail}`}
                    alt="Thumbnail"
                    className="academy_video_thumbnail"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                  />
                  <button className="academy_video_play_button">
                    <PlayArrowRoundedIcon className="academy_video_play_icon" fontSize="large" />
                  </button>
                </div>
              )}

              {/* Video */}
              <video
                className="academy_video"
                id="video_upload"
                playsInline
                controls
                ref={videoRef}
                style={{
                  width: "100%",
                  height: "auto",
                }}
              >
                {videoSource && (
                  <source src={`${config.apiUrl}/streamVideo/${videoSource}`} type="video/mp4" />
                )}
              </video>
            </div>

            <div
              className="academy_template_content"
              dangerouslySetInnerHTML={{ __html: richTextContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademyTemplate;
