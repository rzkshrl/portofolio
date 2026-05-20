// ── Cloudinary Config ──────────────────────────────────────────────
// Ganti nilai ini dengan kredensial Cloudinary kamu
const CLD_CONFIG = {
  cloudName: "dwvaghfci", // dari dashboard Cloudinary
  apiKey: "453717685932771", // dari dashboard Cloudinary
  // API Secret JANGAN taruh di sini (frontend). Hanya dipakai di admin upload via unsigned preset.
  uploadPreset: "portofolio", // buat di Cloudinary: Settings > Upload > Add upload preset > Unsigned
};

// ── URL Builder ────────────────────────────────────────────────────
const cld = {
  base: () => `https://res.cloudinary.com/${CLD_CONFIG.cloudName}`,

  // Thumbnail image dari video atau gambar
  thumb(publicId, { w = 800, h, q = "auto", f = "auto", ar } = {}) {
    const t = [`w_${w}`, `q_${q}`, `f_${f}`, "c_fill"];
    if (h) t.push(`h_${h}`);
    if (ar) t.push(`ar_${ar}`, "c_fill");
    const type = publicId.match(/\.(mp4|mov|webm|avi)$/i) ? "video" : "image";
    const id = publicId.replace(/\.[^.]+$/, ""); // strip extension
    if (type === "video") t.push("so_0"); // snapshot at 0s
    return `${this.base()}/${type}/upload/${t.join(",")}/${id}.jpg`;
  },

  // Video URL optimized (WebM dengan fallback MP4)
  video(publicId, { w = 900, q = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return {
      webm: `${this.base()}/video/upload/w_${w},q_${q},f_webm,vc_vp9/${id}.webm`,
      mp4: `${this.base()}/video/upload/w_${w},q_${q},f_mp4,vc_h264/${id}.mp4`,
    };
  },

  // Image URL optimized
  image(publicId, { w = 900, q = "auto", f = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return `${this.base()}/image/upload/w_${w},q_${q},f_${f},c_fill/${id}`;
  },

  // Upload via unsigned preset
  uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${CLD_CONFIG.cloudName}/auto/upload`;
  },

  uploadPreset: () => CLD_CONFIG.uploadPreset,
  cloudName: () => CLD_CONFIG.cloudName,
  apiKey: () => CLD_CONFIG.apiKey,
};

// ── Project Store (localStorage) ──────────────────────────────────
const store = {
  KEY: "rsm_portfolio_v2",

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || defaultProjects();
    } catch {
      return defaultProjects();
    }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  addMedia(clientId, media) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      client.items.push(media);
      this.save(data);
    }
    return data;
  },

  updateClient(clientId, fields) {
    const data = this.get();
    const idx = data.clients.findIndex((c) => c.id === clientId);
    if (idx > -1) {
      data.clients[idx] = { ...data.clients[idx], ...fields };
      this.save(data);
    }
    return data;
  },

  addClient(client) {
    const data = this.get();
    data.clients.push(client);
    this.save(data);
    return data;
  },

  removeMedia(clientId, mediaId) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      client.items = client.items.filter((m) => m.id !== mediaId);
      this.save(data);
    }
    return data;
  },

  removeClient(clientId) {
    const data = this.get();
    data.clients = data.clients.filter((c) => c.id !== clientId);
    this.save(data);
    return data;
  },

  reorder(clientId, fromIdx, toIdx) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      const [item] = client.items.splice(fromIdx, 1);
      client.items.splice(toIdx, 0, item);
      this.save(data);
    }
    return data;
  },
};

// ── Default project data ───────────────────────────────────────────
function defaultProjects() {
  return {
    profile: {
      name: "Rizky Syahrul M",
      tagline: "Videography · Motion · Design",
      bio: "Seorang kreator visual yang menghadirkan cerita melalui video, gerak, dan desain. Dari Surakarta, berkarya untuk brand-brand terkemuka.",
      skills: ["Videography", "Motion Graphics", "Design", "Content Creator"],
      linkedin: "https://www.linkedin.com/in/rizkysyahrul/",
      email: "rizkysahrul0@gmail.com",
      whatsapp: "+62 822 5387 7985",
    },
    clients: [
      {
        id: "haay-studio",
        name: "Haay Studio",
        sub: "Instagram Reels · Content Production",
        items: [],
      },
      {
        id: "medika-herba",
        name: "Medika Herba",
        sub: "Social Media Content · Short-form Video · Product Ads",
        items: [],
      },
      {
        id: "jagonet",
        name: "PT Sarana Media Cemerlang",
        sub: "Company Profile Video · Jagonet",
        items: [],
      },
      {
        id: "sahada",
        name: "PT Sahada Laku Utama",
        sub: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit",
        items: [],
      },
      {
        id: "politeknik",
        name: "Politeknik Negeri Madiun",
        sub: "Motion Video Graphic · UKM Niknema Photography",
        items: [],
      },
      {
        id: "self",
        name: "Self Projects",
        sub: "Design · Poster · Visual",
        items: [],
      },
    ],
  };
}
