import { useEffect, useState } from "react";

const STOPLIGHT_VERSION = "8.4.0";
const STOPLIGHT_SCRIPT = `https://unpkg.com/@stoplight/elements@${STOPLIGHT_VERSION}/web-components.min.js`;
const STOPLIGHT_STYLES = `https://unpkg.com/@stoplight/elements@${STOPLIGHT_VERSION}/styles.min.css`;

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export default function ApiDocs() {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`link[href="${STOPLIGHT_STYLES}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.media = "all";
      link.href = STOPLIGHT_STYLES;
      document.head.appendChild(link);
    }
    if (document.querySelector(`script[src="${STOPLIGHT_SCRIPT}"]`)) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = STOPLIGHT_SCRIPT;
    script.onload = () => setLoaded(true);
    script.onerror = () => setErrored(true);
    document.head.appendChild(script);
  }, []);

  if (errored) {
    return (
      <div className="bg-ink rounded-lg border border-card/30 p-8 text-card text-sm font-data">
        <p className="eyebrow text-card mb-2">Failed to load Stoplight Elements</p>
        <p className="text-muted">
          Could not load{" "}
          <code className="text-paper">{STOPLIGHT_SCRIPT}</code>.
        </p>
        <p className="text-dim mt-2 text-xs">
          View the raw spec at{" "}
          <a
            href={`${API_BASE}/api/v1/docs`}
            target="_blank"
            rel="noreferrer"
            className="text-pitch hover:text-pitch-glow underline"
          >
            {API_BASE}/api/v1/docs
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="flex items-center justify-center py-32 text-muted text-sm">
          Loading API documentation…
        </div>
      )}
      {/* @ts-expect-error custom element */}
      <elements-api
        apiDescriptionUrl={`${API_BASE}/api/v1/docs`}
        router="hash"
        layout="sidebar"
        tryItCredentialsPolicy="include"
        style={{
          display: "block",
          width: "100%",
          height: "calc(100vh - 2rem)",
          minWidth: 0,
          colorScheme: "dark",
        }}
      />
    </>
  );
}
