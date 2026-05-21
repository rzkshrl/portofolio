// api/media.js
// Vercel Serverless Function — RSM Portfolio
//
// Environment variables required (set in Vercel dashboard):
//   CLOUDINARY_CLOUD_NAME   → dwvaghfci
//   CLOUDINARY_API_KEY      → 453717685932771
//   CLOUDINARY_API_SECRET   → <your secret from Cloudinary dashboard>
//
// Endpoints:
//   GET  /api/media          → list all resources in folder rsm-portfolio
//   POST /api/media          → save metadata/order override to Vercel KV-lite (context tag)
//   GET  /api/media?ping=1   → health check

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Fetch all resources in a folder (handles pagination automatically)
async function fetchAllResources(folder, resourceType = "image") {
  const results = [];
  let nextCursor = undefined;

  do {
    const opts = {
      type:         "upload",
      prefix:       folder + "/",
      max_results:  500,
      context:      true,   // fetch custom metadata (title, subtitle, clientId, order)
      tags:         true,
    };
    if (nextCursor) opts.next_cursor = nextCursor;

    const res = await cloudinary.api.resources_by_asset_folder
      ? cloudinary.api.resources_by_asset_folder(folder, opts)   // SDK v2
      : cloudinary.api.resources(opts);                           // SDK v1 fallback

    results.push(...(res.resources || []));
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return results;
}

// Normalise a Cloudinary resource into the shape index.html expects
function normalise(r) {
  const ctx     = r.context?.custom || {};
  const isVideo = r.resource_type === "video";
  return {
    id:       r.public_id.replace(/\//g, "_") + "_" + (ctx.uploadedAt || r.created_at),
    publicId: r.public_id,
    type:     r.resource_type,               // "image" | "video"
    title:    ctx.title    || r.filename || r.public_id.split("/").pop(),
    subtitle: ctx.subtitle || "",
    clientId: ctx.clientId || "self",        // which client this belongs to
    order:    parseInt(ctx.order  || "9999", 10),
    width:    r.width,
    height:   r.height,
    format:   r.format,
    url:      r.secure_url,
    createdAt: r.created_at,
  };
}

// Build the clients array that renderProjects() expects
function buildClients(resources, defaultClients) {
  // Start from the default client list so order + labels are preserved
  const clients = defaultClients.map(c => ({ ...c, items: [] }));

  // Sort resources by their stored order, then creation date
  const sorted = [...resources].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  sorted.forEach(item => {
    let client = clients.find(c => c.id === item.clientId);
    if (!client) {
      // Unknown clientId — add dynamically (shouldn't happen normally)
      client = { id: item.clientId, name: item.clientId, sub_id: "", sub_en: "", items: [] };
      clients.push(client);
    }
    client.items.push(item);
  });

  return clients;
}

// ── Default client definitions (mirrors cloudinary.js defaultProjects) ───────
const DEFAULT_CLIENTS = [
  { id: "haay-studio",  name: "Haay Studio",              sub_id: "Instagram Reels · Produksi Konten",                               sub_en: "Instagram Reels · Content Production" },
  { id: "medika-herba", name: "Medika Herba",              sub_id: "Konten Media Sosial · Video Pendek · Iklan Produk",               sub_en: "Social Media Content · Short-form Video · Product Ads" },
  { id: "jagonet",      name: "PT Sarana Media Cemerlang", sub_id: "Video Company Profile · Jagonet",                                sub_en: "Company Profile Video · Jagonet" },
  { id: "sahada",       name: "PT Sahada Laku Utama",      sub_id: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit", sub_en: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit" },
  { id: "politeknik",   name: "Politeknik Negeri Madiun",  sub_id: "Motion Video Grafis · UKM Niknema Photography",                  sub_en: "Motion Video Graphic · UKM Niknema Photography" },
  { id: "self",         name: "Self Projects",             sub_id: "Desain · Poster · Visual",                                      sub_en: "Design · Poster · Visual" },
];

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  cors(res);

  // Pre-flight
  if (req.method === "OPTIONS") return res.status(200).end();

  // Health check
  if (req.method === "GET" && req.query.ping) {
    return res.status(200).json({ ok: true, ts: Date.now() });
  }

  // ── GET /api/media ─────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      // Fetch images and videos in parallel
      const [images, videos] = await Promise.all([
        fetchAllResources("rsm-portfolio", "image"),
        fetchAllResources("rsm-portfolio", "video"),
      ]);

      const all       = [...images, ...videos].map(normalise);
      const clients   = buildClients(all, DEFAULT_CLIENTS);

      // Profile is still read from localStorage on the client (admin sets it there)
      // We return clients only; profile stays client-side
      return res.status(200).json({
        ok:      true,
        clients,
        total:   all.length,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[api/media] GET error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── POST /api/media ────────────────────────────────────────────
  // Called by admin.html after upload to attach metadata (clientId, title, subtitle, order)
  // Body: { publicId, resourceType, clientId, title, subtitle, order }
  if (req.method === "POST") {
    try {
      const { publicId, resourceType = "image", clientId, title, subtitle, order } = req.body;
      if (!publicId) return res.status(400).json({ ok: false, error: "publicId required" });

      const context = [
        clientId  != null ? `clientId=${clientId}`           : "",
        title     != null ? `title=${title.replace(/=/g,"―").replace(/\|/g,"‖")}` : "",
        subtitle  != null ? `subtitle=${subtitle.replace(/=/g,"―").replace(/\|/g,"‖")}` : "",
        order     != null ? `order=${order}`                 : "",
        `uploadedAt=${Date.now()}`,
      ].filter(Boolean).join("|");

      await cloudinary.uploader.add_context(context, [publicId], { resource_type: resourceType });

      return res.status(200).json({ ok: true, publicId });
    } catch (err) {
      console.error("[api/media] POST error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
