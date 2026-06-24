import { useEffect, useState } from "react";

const STOPLIGHT_VERSION = "8.4.0";
const STOPLIGHT_SCRIPT = `https://unpkg.com/@stoplight/elements@${STOPLIGHT_VERSION}/web-components.min.js`;
const STOPLIGHT_STYLES = `https://unpkg.com/@stoplight/elements@${STOPLIGHT_VERSION}/styles.min.css`;

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export default function ApiDocs() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${STOPLIGHT_SCRIPT}"]`)) {
      setLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STOPLIGHT_STYLES;
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.type = "module";
    script.src = STOPLIGHT_SCRIPT;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  return (
    <div className="-mx-10 -my-12 h-[calc(100vh-2rem)] bg-ink">
      {!loaded && (
        <div className="flex items-center justify-center h-full text-muted text-sm">
          Loading API documentation…
        </div>
      )}
      {/* @ts-expect-error custom element */}
      <elements-api
        apiDescriptionUrl={`${API_BASE}/api/v1/docs`}
        router="hash"
        layout="sidebar"
        tryItCredentialsPolicy="include"
        className="block h-full"
      />
    </div>
  );
}
