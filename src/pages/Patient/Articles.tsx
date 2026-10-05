import LoadingHelix from "../../components/LoadingHelix";
import React, { useCallback, useEffect, useState } from "react";
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
  IonIcon,
  IonLabel,
} from "@ionic/react";
import { sparklesOutline, refreshOutline } from "ionicons/icons";
import {
  AI_HEALTH_TOPICS,
  DEFAULT_AI_TOPIC,
  HealthTip,
  aiErrorTranslationKey,
  fetchHealthTips,
  readCachedTips,
} from "../../components/Services/healthAiService";
import { useSettings } from "../../context/SettingsContext";
import "./Articles.scss";

const Articles: React.FC = () => {
  const { t, language } = useSettings();

  const [aiTopic, setAiTopic] = useState<string>(DEFAULT_AI_TOPIC);
  const [aiTips, setAiTips] = useState<HealthTip[]>([]);
  const [aiStatus, setAiStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [aiNoticeKey, setAiNoticeKey] = useState<string | null>(null);
  const [aiLive, setAiLive] = useState(false);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);

  const loadAiTips = useCallback(
    async (topic: string) => {
      setAiStatus("loading");
      setAiNoticeKey(null);

      const cached = readCachedTips(topic, language);
      const cachedOk = cached && cached.ok ? cached : null;
      if (cachedOk) {
        setAiTips(cachedOk.tips);
        setAiLive(false);
        setAiGeneratedAt(cachedOk.generatedAt);
      }

      const result = await fetchHealthTips({ topic, language, count: 5 });

      if (result.ok) {
        setAiTips(result.tips);
        setAiLive(true);
        setAiGeneratedAt(result.generatedAt);
        setAiStatus("ready");
        return;
      }

      setAiTips(cachedOk ? cachedOk.tips : []);
      setAiLive(false);
      setAiNoticeKey(aiErrorTranslationKey(result.code));
      setAiStatus("fallback");
    },
    [language],
  );

  useEffect(() => {
    loadAiTips(aiTopic);
  }, [aiTopic, loadAiTips]);

  return (
    <IonPage className="articles-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Health Education</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="articles-ai articles-ai--full">
          <div className="articles-ai-head">
            <div className="articles-ai-heading">
              <p className="articles-ai-eyebrow">
                <IonIcon icon={sparklesOutline} /> {t("aiTipsSubtitle")}
              </p>
              <h2 className="articles-ai-title">{t("aiTipsTitle")}</h2>
            </div>
            <IonButton
              fill="clear"
              size="small"
              className="articles-ai-refresh"
              aria-label={t("refresh")}
              disabled={aiStatus === "loading"}
              onClick={() => loadAiTips(aiTopic)}
            >
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </div>

          <div className="articles-ai-topics">
            {AI_HEALTH_TOPICS.map((topic) => (
              <IonChip
                key={topic.id}
                outline={aiTopic !== topic.id}
                color="primary"
                className={aiTopic === topic.id ? "cat-active" : ""}
                onClick={() => setAiTopic(topic.id)}
              >
                <IonLabel>{t(topic.labelKey)}</IonLabel>
              </IonChip>
            ))}
          </div>

          {aiTips.length === 0 && aiStatus === "loading" ? (
            <div className="articles-ai-loading">
              <LoadingHelix />
              <span>{t("aiTipsLoading")}</span>
            </div>
          ) : (
            <ul
              className={`articles-ai-list${
                aiStatus === "loading" ? " is-loading" : ""
              }`}
            >
              {aiTips.map((tip, i) => (
                <li key={`ai-${aiTopic}-${i}`}>
                  <div>
                    <h4>{tip.title}</h4>
                    <p>{tip.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {aiStatus !== "loading" && aiTips.length === 0 && (
            <p className="articles-ai-empty">{t("aiTipsEmpty")}</p>
          )}

          {aiNoticeKey && (
            <p className="articles-ai-notice">{t(aiNoticeKey)}</p>
          )}

          <div className="articles-ai-foot">
            <p>{t("aiTipsDisclaimer")}</p>
            {aiLive && aiGeneratedAt && (
              <p className="articles-ai-stamp">
                {t("aiTipsUpdated")}{" "}
                {new Date(aiGeneratedAt).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Articles;
