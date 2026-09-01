import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const clientRoot = resolve(projectRoot, "dist", "client");
const androidAssets = resolve(projectRoot, "RoyalSmashAndroid", "app", "src", "main", "assets");
const workerUrl = pathToFileURL(resolve(projectRoot, "dist", "server", "index.js"));
workerUrl.searchParams.set("android-export", String(Date.now()));

const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Could not render the game HTML (${response.status}).`);
const html = await response.text();

await rm(androidAssets, { recursive: true, force: true });
await mkdir(resolve(androidAssets, "assets"), { recursive: true });
await cp(resolve(clientRoot, "assets"), resolve(androidAssets, "assets"), { recursive: true });

for (const filename of await readdir(resolve(clientRoot, "assets"))) {
  await cp(resolve(clientRoot, "assets", filename), resolve(androidAssets, filename));
}

await cp(resolve(clientRoot, "favicon.svg"), resolve(androidAssets, "favicon.svg"));
await writeFile(resolve(androidAssets, "index.html"), html, "utf8");
console.log(`Exported offline game assets to ${androidAssets}`);
