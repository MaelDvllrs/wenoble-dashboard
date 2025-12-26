const { supabaseServerAdmin } = require('../supabase');
const crypto = require('crypto');

/**
 * Upload an image to Supabase Storage
 * Supports base64 or Buffer data
 */
class ImageUploadService {
  constructor() {
    this.bucketName = 'website-edits'; // Nom du bucket à créer dans Supabase
  }

  /**
   * Upload image and return public URL
   * @param {string|Buffer} imageData - Base64 string or Buffer
   * @param {string} websiteId - Website identifier
   * @param {string} pagePath - Page path (e.g., "/about")
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadImage(imageData, websiteId, pagePath) {
    try {
      const supabase = supabaseServerAdmin();

      // Convert base64 to buffer if needed
      let buffer;
      let contentType = 'image/jpeg'; // Default

      if (typeof imageData === 'string') {
        // Check if it's a base64 data URL
        const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
        
        if (base64Match) {
          // Extract content type and base64 data
          const imageType = base64Match[1];
          const base64Data = base64Match[2];
          
          contentType = `image/${imageType}`;
          buffer = Buffer.from(base64Data, 'base64');
        } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
          // If it's already a URL, return it as is
          return imageData;
        } else {
          // Assume it's raw base64 without prefix
          buffer = Buffer.from(imageData, 'base64');
        }
      } else if (Buffer.isBuffer(imageData)) {
        buffer = imageData;
      } else {
        throw new Error('Invalid image data format');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const extension = contentType.split('/')[1] || 'jpg';
      
      // Create path: websiteId/pagePath/timestamp-randomId.ext
      const sanitizedPath = pagePath.replace(/^\//, '').replace(/\//g, '-') || 'root';
      const filePath = `${websiteId}/${sanitizedPath}/${timestamp}-${randomId}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType,
          cacheControl: '31536000', // 1 year
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;

    } catch (error) {
      console.error('Error uploading image to Supabase:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Delete an image from Supabase Storage
   * @param {string} imageUrl - Public URL of the image
   */
  async deleteImage(imageUrl) {
    try {
      if (!imageUrl || !imageUrl.includes(this.bucketName)) {
        return false;
      }

      const supabase = supabaseServerAdmin();

      // Extract file path from URL
      const urlParts = imageUrl.split(`/${this.bucketName}/`);
      if (urlParts.length < 2) {
        return false;
      }

      const filePath = urlParts[1].split('?')[0]; // Remove query params

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error in deleteImage:', error);
      return false;
    }
  }

  /**
   * Check if bucket exists, create if needed
   */
  async ensureBucketExists() {
    try {
      const supabase = supabaseServerAdmin();

      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        throw error;
      }

      const bucketExists = buckets.some(b => b.name === this.bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          throw createError;
        }

        console.log(`✓ Bucket '${this.bucketName}' created successfully`);
      }

      return true;

    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      return false;
    }
  }
}

module.exports = new ImageUploadService();
