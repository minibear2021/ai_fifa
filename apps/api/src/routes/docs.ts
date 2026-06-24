import { Hono } from "hono";
import { buildOpenApiDocument } from "../docs.js";
import type { AppContext } from "../bindings.js";

export const docsRoutes = new Hono<AppContext>();

const docsCache = new Map<string, ReturnType<typeof buildOpenApiDocument>>();
function getDoc(origin: string) {
  let doc = docsCache.get(origin);
  if (!doc) {
    doc = buildOpenApiDocument(origin);
    docsCache.set(origin, doc);
  }
  return doc;
}

docsRoutes.get("/api/v1/docs", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json(getDoc(origin));
});

const STOPLIGHT_CDN = "https://unpkg.com/@stoplight/elements@8.4.0/web-components.min.js";
const STOPLIGHT_STYLES = "https://unpkg.com/@stoplight/elements@8.4.0/styles.min.css";

docsRoutes.get("/api/v1/docs/ui", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>AI FIFA · API 文档</title>
    <link rel="stylesheet" href="${STOPLIGHT_STYLES}" />
    <script type="module" src="${STOPLIGHT_CDN}"></script>
    <style>html, body { margin: 0; height: 100%; background: #0C100D; color: #ECEFE6; color-scheme: dark; }</style>
  </head>
  <body>
    <elements-api
      apiDescriptionUrl="${origin}/api/v1/docs"
      router="hash"
      layout="sidebar"
      tryItCredentialsPolicy="include"
      style="display:block; width:100vw; height:100vh; min-width: 0;"
    />
  </body>
</html>`);
});
