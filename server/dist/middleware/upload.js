"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
// Ensure uploads directories exist
const avatarsDir = path_1.default.join(__dirname, '../../uploads/avatars');
const promptImagesDir = path_1.default.join(__dirname, '../../uploads/prompt-images');
console.log('Upload directories:', {
    avatarsDir,
    promptImagesDir
});
[avatarsDir, promptImagesDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    else {
        console.log(`Directory exists: ${dir}`);
    }
});
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // Choose directory based on field name or path
        const isAvatar = file.fieldname === 'avatar' || req.path.includes('avatar');
        const uploadType = isAvatar ? 'avatars' : 'prompt-images';
        const uploadDir = path_1.default.join(__dirname, `../../uploads/${uploadType}`);
        console.log('Upload destination:', {
            path: req.path,
            fieldname: file.fieldname,
            uploadType,
            uploadDir,
            isAvatar
        });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.id;
        // Create a deterministic hash based on user ID and original filename
        const hash = crypto_1.default
            .createHash('sha256')
            .update(`${userId}-${file.originalname}`)
            .digest('hex')
            .slice(0, 8); // Use first 8 chars of hash
        // Use a more deterministic filename format
        const filename = `${userId}-${hash}${path_1.default.extname(file.originalname)}`;
        console.log('Generated filename:', {
            userId,
            originalName: file.originalname,
            hash,
            filename
        });
        cb(null, filename);
    }
});
// File filter
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    console.log('File upload request:', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        fieldname: file.fieldname,
        allowed: allowedMimes.includes(file.mimetype)
    });
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF files are allowed.'));
    }
};
// Create multer upload instance
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});
