import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';
import crypto from 'crypto';

// Ensure uploads directories exist
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const promptImagesDir = path.join(__dirname, '../../uploads/prompt-images');

console.log('Upload directories:', {
  avatarsDir,
  promptImagesDir
});

[avatarsDir, promptImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`Directory exists: ${dir}`);
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    // Choose directory based on field name or path
    const isAvatar = file.fieldname === 'avatar' || req.path.includes('avatar');
    const uploadType = isAvatar ? 'avatars' : 'prompt-images';
    const uploadDir = path.join(__dirname, `../../uploads/${uploadType}`);
    
    console.log('Upload destination:', {
      path: req.path,
      fieldname: file.fieldname,
      uploadType,
      uploadDir,
      isAvatar
    });
    
    cb(null, uploadDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    const userId = (req as any).user?.id;
    
    // Create a deterministic hash based on user ID and original filename
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}-${file.originalname}`)
      .digest('hex')
      .slice(0, 8); // Use first 8 chars of hash
    
    // Use a more deterministic filename format
    const filename = `${userId}-${hash}${path.extname(file.originalname)}`;
    
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
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  console.log('File upload request:', {
    mimetype: file.mimetype,
    originalname: file.originalname,
    fieldname: file.fieldname,
    allowed: allowedMimes.includes(file.mimetype)
  });
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF files are allowed.'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});
