import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";
import 'dotenv/config'; // هذا سيقرأ .env تلقائياً

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
// console.log("UNSPLASH_ACCESS_KEY:", process.env.UNSPLASH_ACCESS_KEY);
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const wallpapersDir = path.join(process.cwd(), "wallpapers");
if (!fs.existsSync(wallpapersDir)) fs.mkdirSync(wallpapersDir);
const imageForInstallUnslash = "https://images.unsplash.com/"
// serve static folders
app.use("/uploads", express.static(uploadsDir));
app.use("/wallpapers", express.static(wallpapersDir));

const wallpapers = [
  { id: 7, src: "/uploads/MBS.JPG", name: "الامير محمد بن سلمان", mockup: "WatchWhite" },
  { id: 10, src: "/uploads/Saudia.JPG", name: "سعودية", mockup: "WatchCreamy" },
  { id: 11, src: "/uploads/SaudiMap.JPG", name: "خريطة السعودية", mockup: "WatchWhite" },
  { id: 13, src: "/uploads/Nebula.JPG", name: "سديم", mockup: "WatchBlue" },
  { id: 1, src: "/uploads/moon.JPG", name: "سطح القمر", mockup: "WatchWhite" },
  { id: 2, src: "/uploads/earth.JPG", name: "منظر الأرض", mockup: "WatchBlue" },
  { id: 8, src: "/uploads/MBSGold.JPG", name: "الامير محمد بن سلمان", mockup: "WatchCreamy" },
  { id: 3, src: "/uploads/sea.JPG", name: "أمواج المحيط", mockup: "WatchWhite" },
  { id: 4, src: "/uploads/person.JPG", name: "شخص", mockup: "WatchGold" },
  { id: 5, src: "/uploads/stars.JPG", name: "حقل النجوم", mockup: "WatchGold" },
  { id: 6, src: "/uploads/SaudiFlagPassport.JPG", name: "علم السعودية", mockup: "WatchGrey" },
  { id: 9, src: "/uploads/Planets.JPG", name: "الكواكب والشمس", mockup: "WatchBlue" },
  { id: 12, src: "/uploads/SaudiFlagTwoColors.JPG", name: "شعار المملكة", mockup: "WatchGrey" },
];

// --- رفع صورة ---
app.post("/upload", (req, res) => {
  if (!req.files || !req.files.photo) return res.status(400).send("No file uploaded.");

  const photo = req.files.photo;
  const filename = `صورة_${Date.now()}${path.extname(photo.name)}`;

  photo.mv(path.join(uploadsDir, filename), (err) => {
    if (err) return res.status(500).send(err);
    const url = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    res.json({ filename, url });
  });
});

// --- حذف صورة ---
app.delete("/delete/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).send(err);
    res.send({ message: "تم حذف الصورة بنجاح" });
  });
});

// --- تحميل صورة Unsplash (يجب أن يأتي قبل /download/:filename) ---
// تحميل صور Unsplash مباشرة
app.get("/download/unsplash/:id", async (req, res) => {
  const photoId = req.params.id;
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  try {
    const info = await axios.get(`https://api.unsplash.com/photos/${photoId}?client_id=${accessKey}`);
    const imageUrl = info.data.urls.raw; // استخدم raw أو regular

    const imageResponse = await axios.get(imageUrl, { responseType: "stream", timeout: 30000 });

    res.setHeader("Content-Disposition", `attachment; filename="${photoId}.jpg"`);
    res.setHeader("Content-Type", "image/jpeg");
    imageResponse.data.pipe(res);
  } catch (err) {
    console.error("Proxy download error:", err.message);
    res.status(500).json({ message: "Failed to download image" });
  }
});

// --- تحميل صورة محلية ---
app.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found." });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send({ message: "Failed to download file." });
    }
  });
});

// --- عرض جميع الصور ---
app.get("/all-wallpapers", (req, res) => {
  const host = `${req.protocol}://${req.get("host")}`;

  const staticWallpapers = wallpapers.map((wp) => ({
    ...wp,
    src: `${host}${wp.src}`,
  }));

  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json({ error: "Unable to read uploads folder" });

    const uploadedWallpapers = files.map((file, index) => ({
      id: 1000 + index,
      src: `${host}/uploads/${file}`,
      name: `صورة ${staticWallpapers.length + index + 1}`,
      mockup: "WatchWhite",
    }));

    res.json([...staticWallpapers, ...uploadedWallpapers]);
  });
});

// --- اختبار السيرفر ---
app.get("/", (req, res) => res.send("✅ Server is running"));

// --- تشغيل السيرفر ---
const PORT = 1000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);