import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonChip,
  IonLabel,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
  IonModal,
  IonIcon,
  IonSearchbar,
} from "@ionic/react";
import {
  playCircleOutline,
  eyeOutline,
  thumbsUpOutline,
  thumbsDownOutline,
  shareOutline,
  chevronDownOutline,
  chevronUpOutline,
  openOutline,
  searchOutline,
  closeOutline,
  refreshOutline,
  timeOutline,
  chatbubbleOutline,
  sendOutline,
} from "ionicons/icons";
import "./Articles.scss";

// ── Types ─────────────────────────────────────────────────────────────────────

interface YTVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  duration: string;
}

interface ArtComment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

// ── Health topic presets ───────────────────────────────────────────────────────

const HEALTH_TOPICS = [
  { id: "all",      label: "All",          query: "health education africa" },
  { id: "mpox",     label: "Mpox",         query: "mpox monkeypox disease education" },
  { id: "malaria",  label: "Malaria",      query: "malaria prevention treatment africa" },
  { id: "cholera",  label: "Cholera",      query: "cholera prevention treatment" },
  { id: "typhoid",  label: "Typhoid",      query: "typhoid fever prevention health" },
  { id: "hiv",      label: "HIV/AIDS",     query: "HIV AIDS prevention education africa" },
  { id: "tb",       label: "Tuberculosis", query: "tuberculosis TB prevention treatment" },
  { id: "covid",    label: "COVID-19",     query: "COVID-19 coronavirus education" },
  { id: "diabetes", label: "Diabetes",     query: "diabetes management prevention" },
  { id: "hypert",   label: "Hypertension", query: "hypertension blood pressure management" },
  { id: "nutrition",label: "Nutrition",    query: "nutrition healthy eating africa" },
  { id: "maternal", label: "Maternal",     query: "maternal health pregnancy care africa" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const YOUTUBE_API_KEY  = import.meta.env.VITE_YOUTUBE_API_KEY || "";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE        = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCount(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return String(num);
}

function formatDuration(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0");
  const min = parseInt(m[2] || "0");
  const s   = parseInt(m[3] || "0");
  if (h > 0) return `${h}:${String(min).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${min}:${String(s).padStart(2,"0")}`;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const Articles: React.FC = () => {
  // Topic + search
  const [activeTopic, setActiveTopic]     = useState(HEALTH_TOPICS[0]);
  const [searchText,  setSearchText]      = useState("");
  const [searchInput, setSearchInput]     = useState("");

  // Video data
  const [videos,      setVideos]          = useState<YTVideo[]>([]);
  const [loading,     setLoading]         = useState(false);
  const [error,       setError]           = useState("");
  const [nextPage,    setNextPage]        = useState<string | null>(null);
  const [hasMore,     setHasMore]         = useState(true);

  // UI state
  const [expanded,    setExpanded]        = useState<string | null>(null);
  const [liked,       setLiked]           = useState<Set<string>>(new Set());
  const [disliked,    setDisliked]        = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo]     = useState<YTVideo | null>(null);

  // ── Live count deltas ──────────────────────────────────────────────────────
  const [likeDelta,    setLikeDelta]    = useState<Record<string, number>>({});
  const [dislikeDelta, setDislikeDelta] = useState<Record<string, number>>({});

  // ── Comment state ──────────────────────────────────────────────────────────
  const [comments,      setComments]      = useState<Record<string, ArtComment[]>>({});
  const [commentInput,  setCommentInput]  = useState("");
  const [showComments,  setShowComments]  = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const infiniteScrollRef = useRef<HTMLIonInfiniteScrollElement>(null);
  const contentRef        = useRef<HTMLIonContentElement>(null);

  // ── Live count helpers ─────────────────────────────────────────────────────

  const getLiveLikeCount = (video: YTVideo) => {
    const base  = parseInt(video.likeCount, 10) || 0;
    const delta = likeDelta[video.id] ?? 0;
    return formatCount(String(Math.max(0, base + delta)));
  };

  const getLiveDislikeCount = (videoId: string) =>
    formatCount(String(dislikeDelta[videoId] ?? 0));

  const getLiveCommentCount = (videoId: string, apiCount: string) => {
    const base  = parseInt(apiCount, 10) || 0;
    const local = comments[videoId]?.length || 0;
    return formatCount(String(base + local));
  };

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchVideos = useCallback(
    async (query: string, pageToken?: string) => {
      const isFirstPage = !pageToken;
      if (isFirstPage) {
        setLoading(true);
        setError("");
        setVideos([]);
        setNextPage(null);
        setHasMore(true);
      }

      try {
        if (!YOUTUBE_API_KEY) throw new Error("no_key");

        const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const searchUrl =
          `${YOUTUBE_API_BASE}/search?part=snippet&type=video` +
          `&q=${encodeURIComponent(query)}&maxResults=${PAGE_SIZE}${pageParam}` +
          `&relevanceLanguage=en&safeSearch=moderate&key=${YOUTUBE_API_KEY}`;

        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`api_${searchRes.status}`);
        const searchData = await searchRes.json();

        if (!searchData.items?.length) {
          setHasMore(false);
          if (isFirstPage) setVideos([]);
          return;
        }

        const ids = (searchData.items as any[])
          .map((i) => i.id?.videoId)
          .filter(Boolean)
          .join(",");

        const statsUrl =
          `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails` +
          `&id=${ids}&key=${YOUTUBE_API_KEY}`;
        const statsRes  = await fetch(statsUrl);
        const statsData = statsRes.ok ? await statsRes.json() : { items: [] };
        const statsMap: Record<string, any> = {};
        (statsData.items || []).forEach((v: any) => { statsMap[v.id] = v; });

        const items: YTVideo[] = (searchData.items as any[])
          .filter((i) => i.id?.videoId)
          .map((item) => {
            const id = item.id.videoId as string;
            const s  = statsMap[id];
            return {
              id,
              title:        item.snippet.title,
              description:  item.snippet.description || "",
              thumbnail:    item.snippet.thumbnails?.medium?.url ||
                            item.snippet.thumbnails?.default?.url || "",
              channelTitle: item.snippet.channelTitle,
              publishedAt:  item.snippet.publishedAt,
              viewCount:    s?.statistics?.viewCount    || "0",
              likeCount:    s?.statistics?.likeCount    || "0",
              commentCount: s?.statistics?.commentCount || "0",
              duration:     s?.contentDetails?.duration || "",
            };
          });

        setVideos((prev) => isFirstPage ? items : [...prev, ...items]);
        const next = searchData.nextPageToken || null;
        setNextPage(next);
        setHasMore(!!next);
      } catch (err: any) {
        const msg = err.message === "no_key"
          ? "YouTube API key is not configured."
          : "Could not load videos. Check your connection and try again.";
        setError(msg);
        setHasMore(false);
      } finally {
        setLoading(false);
        infiniteScrollRef.current?.complete();
      }
    },
    [],
  );

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = searchText.trim() || activeTopic.query;
    fetchVideos(q);
    contentRef.current?.scrollToTop(200);
  }, [activeTopic, searchText, fetchVideos]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTopicChange = (topic: typeof HEALTH_TOPICS[0]) => {
    setSearchText("");
    setSearchInput("");
    setActiveTopic(topic);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchText(searchInput.trim());
  };

  const handleSearchbarChange = (value: string) => {
    setSearchInput(value);
    if (!value.trim()) setSearchText("");
  };

  const handleInfiniteScroll = async (e: CustomEvent) => {
    if (!hasMore || loading) {
      (e.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
    const q = searchText.trim() || activeTopic.query;
    await fetchVideos(q, nextPage ?? undefined);
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const n = new Set(prev);
      const wasLiked = n.has(id);
      wasLiked ? n.delete(id) : n.add(id);
      setLikeDelta(d => ({ ...d, [id]: wasLiked ? 0 : 1 }));
      return n;
    });
    // undo dislike if switching
    setDisliked((prev) => {
      if (prev.has(id)) {
        setDislikeDelta(d => ({ ...d, [id]: Math.max(0, (d[id] ?? 0) - 1) }));
        const n = new Set(prev); n.delete(id); return n;
      }
      return prev;
    });
  };

  const toggleDislike = (id: string) => {
    setDisliked((prev) => {
      const n = new Set(prev);
      const wasDisliked = n.has(id);
      wasDisliked ? n.delete(id) : n.add(id);
      setDislikeDelta(d => ({ ...d, [id]: wasDisliked ? Math.max(0, (d[id] ?? 0) - 1) : (d[id] ?? 0) + 1 }));
      return n;
    });
    // undo like if switching
    setLiked((prev) => {
      if (prev.has(id)) {
        setLikeDelta(d => ({ ...d, [id]: 0 }));
        const n = new Set(prev); n.delete(id); return n;
      }
      return prev;
    });
  };

  const shareVideo = async (video: YTVideo) => {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* user cancelled */ }
  };

  const addComment = (videoId: string) => {
    const text = commentInput.trim();
    if (!text) return;
    const comment: ArtComment = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      author: "You",
      timestamp: Date.now(),
    };
    setComments(prev => ({ ...prev, [videoId]: [...(prev[videoId] || []), comment] }));
    setCommentInput("");
  };

  const openWithComments = (video: YTVideo) => {
    setActiveVideo(video);
    setShowComments(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <IonPage className="articles-page">
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Health Education</IonTitle>
          {!loading && (
            <IonButtons slot="end">
              <IonButton
                fill="clear"
                size="small"
                aria-label="Refresh"
                onClick={() => fetchVideos(searchText.trim() || activeTopic.query)}
              >
                <IonIcon icon={refreshOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} fullscreen>
        {/* ── Search bar ──────────────────────────────────────────────── */}
        <form className="art-search-form" onSubmit={handleSearch}>
          <IonSearchbar
            className="art-searchbar"
            placeholder="Search health topics…"
            value={searchInput}
            onIonInput={(e) => handleSearchbarChange(e.detail.value ?? "")}
            onIonClear={() => handleSearchbarChange("")}
            searchIcon={searchOutline}
            clearIcon={closeOutline}
            debounce={0}
            animated
          />
        </form>

        {/* ── Topic chips ──────────────────────────────────────────────── */}
        <div className="art-topics">
          {HEALTH_TOPICS.map((topic) => (
            <IonChip
              key={topic.id}
              outline={activeTopic.id !== topic.id}
              color="primary"
              className={activeTopic.id === topic.id ? "art-chip--active" : ""}
              onClick={() => handleTopicChange(topic)}
            >
              <IonLabel>{topic.label}</IonLabel>
            </IonChip>
          ))}
        </div>

        {/* ── Section heading ──────────────────────────────────────────── */}
        <div className="art-section-head">
          <div className="art-play-icon" aria-hidden="true">
            <IonIcon icon={playCircleOutline} />
          </div>
          <h2 className="art-section-title">
            {searchText ? `"${searchText}"` : activeTopic.label}
          </h2>
        </div>

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {loading && (
          <div className="art-skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="art-skeleton-item">
                <IonSkeletonText animated className="art-skeleton-thumb" />
                <div className="art-skeleton-body">
                  <IonSkeletonText animated style={{ width: "90%", height: "14px", borderRadius: "4px" }} />
                  <IonSkeletonText animated style={{ width: "65%", height: "12px", borderRadius: "4px" }} />
                  <IonSkeletonText animated style={{ width: "45%", height: "11px", borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="art-error">
            <IonIcon icon={closeOutline} className="art-error-icon" />
            <p>{error}</p>
            <IonButton
              size="small"
              fill="outline"
              onClick={() => fetchVideos(searchText.trim() || activeTopic.query)}
            >
              <IonIcon icon={refreshOutline} slot="start" />
              Retry
            </IonButton>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!loading && !error && videos.length === 0 && (
          <div className="art-empty">
            <IonIcon icon={playCircleOutline} className="art-empty-icon" />
            <p>No videos found for this topic.</p>
            <IonButton size="small" fill="outline" onClick={() => fetchVideos(activeTopic.query)}>
              Load default videos
            </IonButton>
          </div>
        )}

        {/* ── Video list ───────────────────────────────────────────────── */}
        {!loading && videos.length > 0 && (
          <div className="art-video-list">
            {videos.map((video) => {
              const isExpanded = expanded === video.id;
              const isLiked    = liked.has(video.id);
              const isDisliked = disliked.has(video.id);
              const dur        = formatDuration(video.duration);

              return (
                <div key={video.id} className="art-video-item">
                  {/* Thumbnail */}
                  <div
                    className="art-thumb-wrap"
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${video.title}`}
                    onClick={() => setActiveVideo(video)}
                    onKeyDown={(e) => e.key === "Enter" && setActiveVideo(video)}
                  >
                    <img src={video.thumbnail} alt={video.title} className="art-thumb" loading="lazy" />
                    <div className="art-play-overlay" aria-hidden="true">
                      <div className="art-play-circle">
                        <IonIcon icon={playCircleOutline} />
                      </div>
                    </div>
                    {dur && <span className="art-duration" aria-label={`Duration: ${dur}`}>{dur}</span>}
                  </div>

                  {/* Info */}
                  <div className="art-info">
                    <div className="art-info-top">
                      <span className="art-channel">{video.channelTitle}</span>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="art-ext-link"
                        aria-label="Open video in browser"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IonIcon icon={openOutline} />
                      </a>
                    </div>

                    <h3 className="art-title">{video.title}</h3>

                    {/* Stats row — live counts */}
                    <div className="art-stats-row">
                      <span className="art-stat">
                        <IonIcon icon={eyeOutline} />
                        {formatCount(video.viewCount)}
                      </span>
                      <span className="art-stat">
                        <IonIcon icon={thumbsUpOutline} />
                        {getLiveLikeCount(video)}
                      </span>
                      <span className="art-stat">
                        <IonIcon icon={chatbubbleOutline} />
                        {getLiveCommentCount(video.id, video.commentCount)}
                      </span>
                      {dur && (
                        <span className="art-stat">
                          <IonIcon icon={timeOutline} />
                          {dur}
                        </span>
                      )}
                      <span className="art-stat art-stat--time">{timeAgo(video.publishedAt)}</span>
                    </div>

                    {/* Description toggle */}
                    {video.description && (
                      <>
                        {isExpanded && <p className="art-description">{video.description}</p>}
                        <button
                          className="art-expand-btn"
                          onClick={() => setExpanded(isExpanded ? null : video.id)}
                          aria-expanded={isExpanded}
                        >
                          <IonIcon icon={isExpanded ? chevronUpOutline : chevronDownOutline} />
                          {isExpanded ? "Less" : "More"}
                        </button>
                      </>
                    )}

                    {/* Action buttons — with live counts */}
                    <div className="art-actions" role="group" aria-label="Video actions">
                      <button
                        className={`art-action-btn${isLiked ? " art-action-btn--liked" : ""}`}
                        onClick={() => toggleLike(video.id)}
                        aria-label="Like"
                        aria-pressed={isLiked}
                      >
                        <IonIcon icon={thumbsUpOutline} />
                        <span>{getLiveLikeCount(video)}</span>
                      </button>
                      <button
                        className={`art-action-btn${isDisliked ? " art-action-btn--disliked" : ""}`}
                        onClick={() => toggleDislike(video.id)}
                        aria-label="Dislike"
                        aria-pressed={isDisliked}
                      >
                        <IonIcon icon={thumbsDownOutline} />
                        <span>{getLiveDislikeCount(video.id)}</span>
                      </button>
                      <button
                        className="art-action-btn"
                        onClick={() => shareVideo(video)}
                        aria-label="Share"
                      >
                        <IonIcon icon={shareOutline} />
                        <span>Share</span>
                      </button>
                      <button
                        className="art-action-btn"
                        onClick={() => openWithComments(video)}
                        aria-label="Comment"
                      >
                        <IonIcon icon={chatbubbleOutline} />
                        <span>{getLiveCommentCount(video.id, video.commentCount)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Infinite Scroll ──────────────────────────────────────────── */}
        <IonInfiniteScroll
          ref={infiniteScrollRef}
          threshold="200px"
          disabled={!hasMore || loading}
          onIonInfinite={handleInfiniteScroll}
        >
          <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Loading more videos…" />
        </IonInfiniteScroll>
      </IonContent>

      {/* ── Video Player Modal ────────────────────────────────────────────── */}
      <IonModal
        isOpen={!!activeVideo}
        onDidDismiss={() => { setActiveVideo(null); setShowComments(false); setCommentInput(""); }}
        className="art-modal"
        aria-label="Video player"
      >
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle className="art-modal-channel-title">{activeVideo?.channelTitle}</IonTitle>
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={() => setActiveVideo(null)} aria-label="Close">
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="art-modal-content">
          {activeVideo && (
            <>
              <div className="art-modal-player-wrap">
                <iframe
                  className="art-modal-player"
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&controls=1&rel=0&fs=1&playsinline=1&modestbranding=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>

              <div className="art-modal-info">
                <h3 className="art-modal-title">{activeVideo.title}</h3>

                {/* Stats row — live counts */}
                <div className="art-stats-row" style={{ marginBottom: 10 }}>
                  <span className="art-stat">
                    <IonIcon icon={eyeOutline} />
                    {formatCount(activeVideo.viewCount)} views
                  </span>
                  <span className="art-stat">
                    <IonIcon icon={thumbsUpOutline} />
                    {getLiveLikeCount(activeVideo)}
                  </span>
                  <span className="art-stat">
                    <IonIcon icon={chatbubbleOutline} />
                    {getLiveCommentCount(activeVideo.id, activeVideo.commentCount)}
                  </span>
                  {formatDuration(activeVideo.duration) && (
                    <span className="art-stat">
                      <IonIcon icon={timeOutline} />
                      {formatDuration(activeVideo.duration)}
                    </span>
                  )}
                  <span className="art-stat art-stat--time">{timeAgo(activeVideo.publishedAt)}</span>
                </div>

                {/* Action buttons */}
                <div className="art-actions" role="group" aria-label="Video actions">
                  <button
                    className={`art-action-btn${liked.has(activeVideo.id) ? " art-action-btn--liked" : ""}`}
                    onClick={() => toggleLike(activeVideo.id)}
                    aria-label="Like"
                    aria-pressed={liked.has(activeVideo.id)}
                  >
                    <IonIcon icon={thumbsUpOutline} />
                    <span>{getLiveLikeCount(activeVideo)}</span>
                  </button>
                  <button
                    className={`art-action-btn${disliked.has(activeVideo.id) ? " art-action-btn--disliked" : ""}`}
                    onClick={() => toggleDislike(activeVideo.id)}
                    aria-label="Dislike"
                    aria-pressed={disliked.has(activeVideo.id)}
                  >
                    <IonIcon icon={thumbsDownOutline} />
                    <span>{getLiveDislikeCount(activeVideo.id)}</span>
                  </button>
                  <button
                    className="art-action-btn"
                    onClick={() => shareVideo(activeVideo)}
                    aria-label="Share"
                  >
                    <IonIcon icon={shareOutline} />
                    <span>Share</span>
                  </button>
                  <button
                    className={`art-action-btn${showComments ? " art-action-btn--liked" : ""}`}
                    onClick={() => {
                      setShowComments(v => !v);
                      setTimeout(() => commentInputRef.current?.focus(), 120);
                    }}
                    aria-label="Toggle comments"
                  >
                    <IonIcon icon={chatbubbleOutline} />
                    <span>{getLiveCommentCount(activeVideo.id, activeVideo.commentCount)}</span>
                  </button>
                  <a
                    className="art-action-btn"
                    href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open in browser"
                  >
                    <IonIcon icon={openOutline} />
                    <span>Open</span>
                  </a>
                </div>

                {/* Description */}
                {activeVideo.description && (
                  <p className="art-description art-modal-desc">{activeVideo.description}</p>
                )}

                {/* ── Comment panel ── */}
                {showComments && (
                  <div className="art-comment-panel">
                    <h4 className="art-comment-panel-title">
                      <IonIcon icon={chatbubbleOutline} />
                      Comments
                    </h4>

                    <div className="art-comment-list">
                      {(comments[activeVideo.id] || []).length === 0 ? (
                        <p className="art-comment-empty">Be the first to comment!</p>
                      ) : (
                        (comments[activeVideo.id] || []).map(c => (
                          <div key={c.id} className="art-comment-item">
                            <div className="art-comment-avatar">
                              {c.author.charAt(0).toUpperCase()}
                            </div>
                            <div className="art-comment-body">
                              <span className="art-comment-author">{c.author}</span>
                              <p className="art-comment-text">{c.text}</p>
                              <span className="art-comment-time">
                                {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="art-comment-input-row">
                      <input
                        ref={commentInputRef}
                        className="art-comment-input"
                        placeholder="Add a comment…"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addComment(activeVideo.id)}
                        maxLength={300}
                      />
                      <button
                        className="art-comment-send-btn"
                        onClick={() => addComment(activeVideo.id)}
                        disabled={!commentInput.trim()}
                        aria-label="Send comment"
                      >
                        <IonIcon icon={sendOutline} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Articles;
