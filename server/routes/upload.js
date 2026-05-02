const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
['images', 'audio'].forEach(d => {
  const p = path.join(UPLOAD_DIR, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/wave'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, IMAGE_TYPES.includes(file.mimetype) ? 'images' : 'audio'));
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    cb(null, [...IMAGE_TYPES, ...AUDIO_TYPES].includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = { upload, UPLOAD_DIR };
