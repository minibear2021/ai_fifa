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
    <div className="-my-12 -mx-10 bg-ink h-[calc(100vh-2rem)] overflow-hidden">
      {!loaded && (
        <div className="flex items-center justify-center h-full text-muted text-sm">
          Loading API documentation…
        </div>
      )}
      <style>{`
        elements-api {
          height: 100% !important;
          display: block;
          --font-family: "Geist", system-ui, sans-serif;
        }
        elements-api * {
          font-family: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif !important;
        }
        /* Force sidebar content to not clip horizontally */
        elements-api .sl-elements-api-left-nav,
        elements-api [class*="Sidebar__StyledSidebar"],
        elements-api [class*="sidebar__Container"] {
          overflow-x: hidden !important;
          padding-left: 0 !important;
        }
        elements-api [class*="Section__Heading"],
        elements-api [class*="Section__CollapsedHeading"] {
          padding-left: 16px !important;
        }
        elements-api [class*="Operation__OperationContainer"] {
          padding-left: 16px !important;
        }
      `}</style>
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
