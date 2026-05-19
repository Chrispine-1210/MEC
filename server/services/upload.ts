import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { nanoid } from "nanoid";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${nanoid()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types
  const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const extname = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimetypes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (JPG, PNG, GIF, WEBP) are allowed.'));
  }
};

export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Image processing function
export const processImage = async (inputPath: string): Promise<string> => {
  const outputPath = inputPath.replace(/\.[^/.]+$/, '_processed.webp');
  
  try {
    await sharp(inputPath)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

// Generate different image sizes for responsive design
export const generateImageSizes = async (inputPath: string): Promise<{ [key: string]: string }> => {
  const sizes = {
    thumbnail: { width: 300, height: 200 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 800 },
  };

  const results: { [key: string]: string } = {};

  try {
    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      const outputPath = inputPath.replace(/\.[^/.]+$/, `_${sizeName}.webp`);
      
      await sharp(inputPath)
        .resize(dimensions.width, dimensions.height, { 
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      results[sizeName] = outputPath;
    }

    return results;
  } catch (error) {
    console.error('Image size generation error:', error);
    throw error;
  }
};

// Clean up old files (optional utility function)
export const cleanupOldFiles = async (maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> => {
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};