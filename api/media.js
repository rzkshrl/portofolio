// api/media.js — Vercel Serverless Function (CommonJS)
//
// ENV vars (set di Vercel Dashboard → Settings → Environment Variables):
//   CLOUDINARY_CLOUD_NAME = dwvaghfci
//   CLOUDINARY_API_KEY    = 453717685932771
//   CLOUDINARY_API_SECRET = <dari Cloudinary Dashboard → Settings → API Keys>

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── CORS ─────────────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Fetch semua resource di folder (handle pagination) ───────────────────────
async function fetchFolder(folder, resourceType) {
  const all = [];
  let next_cursor;
  do {
    const params = {
      type:        "upload",
      prefix:      folder + "/",
      resource_type: resourceType,
      max_results: 500,
      context:     true,
      tags:        true,
    };
    if (next_cursor) params.next_cursor = next_cursor;
    const res = await cloudinary.api.resources(params);
    all.push(...(res.resources || []));
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return all;
}

// ── Normalise resource → shape yang dipakai index.html ───────────────────────
function normalise(r) {
  const ctx = r.context && r.context.custom ? r.context.custom : {};
  return {
    id:        r.public_id.replace(/\//g, "_") + "_" + (ctx.uploadedAt || ""),
    publicId:  r.public_id,
    type:      r.resource_type,
    title:     ctx.title    || r.public_id.split("/").pop(),
    subtitle:  ctx.subtitle || "",
    clientId:  ctx.clientId || "self",
    order:     parseInt(ctx.order || "9999", 10),
    width:     r.width  || 9,
    height:    r.height || 16,
    format:    r.format || "",
    url:       r.secure_url,
    createdAt: r.created_at,
  };
}

// ── Default clients (sama dengan cloudinary.js defaultProjects) ──────────────
const DEFAULT_CLIENTS = [
  { id: "haay-studio",  name: "Haay Studio",              sub_id: "Instagram Reels · Produksi Konten",                               sub_en: "Instagram Reels · Content Production"                          },
  { id: "medika-herba", name: "Medika Herba",              sub_id: "Konten Media Sosial · Video Pendek · Iklan Produk",               sub_en: "Social Media Content · Short-form Video · Product Ads"          },
  { id: "jagonet",      name: "PT Sarana Media Cemerlang", sub_id: "Video Company Profile · Jagonet",                                sub_en: "Company Profile Video · Jagonet"                                },
  { id: "sahada",       name: "PT Sahada Laku Utama",      sub_id: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit", sub_en: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit" },
  { id: "politeknik",   name: "Politeknik Negeri Madiun",  sub_id: "Motion Video Grafis · UKM Niknema Photography",                  sub_en: "Motion Video Graphic · UKM Niknema Photography"                 },
  { id: "self",         name: "Self Projects",             sub_id: "Desain · Poster · Visual",                                      sub_en: "Design · Poster · Visual"                                       },
];

// Default profile — dipakai kalau belum pernah di-save via POST /api/media?type=profile
const DEFAULT_PROFILE = {
  name:     "Rizky Syahrul M",
  tagline:  "Videography · Motion · Design",
  bio_id:   "Seorang kreator visual yang menghadirkan cerita melalui video, gerak, dan desain. Dari Surakarta, berkarya untuk brand-brand terkemuka.",
  bio_en:   "A visual creator who brings stories to life through video, motion, and design. Based in Surakarta, crafting content for leading brands.",
  linkedin: "https://www.linkedin.com/in/rizkysyahrul/",
  email:    "rizkysahrul0@gmail.com",
  whatsapp: "+62 822 5387 7985",
};

// ── Build clients array ───────────────────────────────────────────────────────
function buildClients(resources) {
  const clients = DEFAULT_CLIENTS.map(c => ({ ...c, items: [] }));
  const sorted  = [...resources].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  sorted.forEach(item => {
    let client = clients.find(c => c.id === item.clientId);
    if (!client) {
      client = { id: item.clientId, name: item.clientId, sub_id: "", sub_en: "", items: [] };
      clients.push(client);
    }
    client.items.push(item);
  });
  return clients;
}

// ── Simpan profile sebagai Cloudinary tag pada dummy resource ─────────────────
// Cara paling simple tanpa DB: simpan JSON profile di Cloudinary "context" pada
// sebuah resource khusus bernama "rsm-portfolio/__profile__"
// Kalau resource itu belum ada, upload placeholder 1x1 PNG transparan.
const PROFILE_PUBLIC_ID = "rsm-portfolio/__profile__";
const PLACEHOLDER_PNG   = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function getProfile() {
  try {
    const r   = await cloudinary.api.resource(PROFILE_PUBLIC_ID, { context: true });
    const ctx = r.context && r.context.custom ? r.context.custom : {};
    if (ctx.profile_json) return JSON.parse(ctx.profile_json);
  } catch (e) {
    // Resource belum ada — kembalikan default
  }
  return { ...DEFAULT_PROFILE };
}

async function saveProfile(profile) {
  // Pastikan resource placeholder ada
  try {
    await cloudinary.api.resource(PROFILE_PUBLIC_ID);
  } catch (e) {
    // Belum ada — upload placeholder
    await cloudinary.uploader.upload(PLACEHOLDER_PNG, {
      public_id:     PROFILE_PUBLIC_ID,
      resource_type: "image",
      overwrite:     true,
    });
  }
  // Simpan profile sebagai context JSON
  const safeJson = JSON.stringify(profile).replace(/\|/g, "｜").replace(/=/g, "＝");
  await cloudinary.uploader.add_context(`profile_json=${safeJson}`, [PROFILE_PUBLIC_ID], { resource_type: "image" });
}

// ── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const type = req.query.type; // ?type=profile | ?type=media (default)

  // ── GET ──────────────────────────────────────────────────────────
  if (req.method === "GET") {
    // Health check
    if (req.query.ping) return res.status(200).json({ ok: true, ts: Date.now() });

    try {
      if (type === "profile") {
        const profile = await getProfile();
        return res.status(200).json({ ok: true, profile });
      }

      // Default: return media + profile sekaligus
      const [images, videos, profile] = await Promise.all([
        fetchFolder("rsm-portfolio", "image"),
        fetchFolder("rsm-portfolio", "video"),
        getProfile(),
      ]);

      // Exclude placeholder profile resource
      const allRaw  = [...images, ...videos].filter(r => r.public_id !== PROFILE_PUBLIC_ID);
      const all     = allRaw.map(normalise);
      const clients = buildClients(all);

      return res.status(200).json({ ok: true, profile, clients, total: all.length });
    } catch (err) {
      console.error("[GET] error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── POST ─────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      if (type === "profile") {
        // Body: profile object
        const profile = req.body;
        if (!profile || typeof profile !== "object") {
          return res.status(400).json({ ok: false, error: "body harus berisi profile object" });
        }
        await saveProfile(profile);
        return res.status(200).json({ ok: true });
      }

      // Default: save media metadata (context) ke Cloudinary
      const { publicId, resourceType = "image", clientId, title, subtitle, order } = req.body;
      if (!publicId) return res.status(400).json({ ok: false, error: "publicId required" });

      const safe = s => String(s || "").replace(/=/g, "＝").replace(/\|/g, "｜");
      const context = [
        `clientId=${safe(clientId)}`,
        `title=${safe(title)}`,
        `subtitle=${safe(subtitle)}`,
        `order=${order != null ? order : 9999}`,
        `uploadedAt=${Date.now()}`,
      ].join("|");

      await cloudinary.uploader.add_context(context, [publicId], { resource_type: resourceType });
      return res.status(200).json({ ok: true, publicId });
    } catch (err) {
      console.error("[POST] error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
};
