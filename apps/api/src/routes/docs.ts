import { Hono } from "hono";
import { buildOpenApiDocument } from "../docs.js";
import type { AppContext } from "../bindings.js";

export const docsRoutes = new Hono<AppContext>();

let cached: ReturnType<typeof buildOpenApiDocument> | null = null;
function getDoc() {
  if (!cached) cached = buildOpenApiDocument();
  return cached;
}

docsRoutes.get("/api/v1/docs", (c) => c.json(getDoc()));

const STOPLIGHT_CDN = "https://unpkg.com/@stoplight/elements@8.4.0/web-components.min.js";
const STOPLIGHT_STYLES = "https://unpkg.com/@stoplight/elements@8.4.0/styles.min.css";

docsRoutes.get("/api/v1/docs/ui", (c) =>
  c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>AI FIFA · API 文档</title>
    <link rel="stylesheet" href="${STOPLIGHT_STYLES}" />
    <script type="module" src="${STOPLIGHT_CDN}"></script>
  </head>
  <body style="margin:0;height:100vh">
    <elements-api
      apiDescriptionUrl="/api/v1/docs"
      router="hash"
      layout="sidebar"
      tryItCredentialsPolicy="include"
    />
  </body>
</html>`),
);
