import { put, del, list } from '@vercel/blob';

export class BlobStorage {
  // Upload event images
  static async uploadEventImage(file: File, eventId: string) {
    try {
      const { url } = await put(`events/${eventId}/${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });
      return url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  // Upload user profile pictures
  static async uploadProfilePicture(file: File, userId: string) {
    try {
      const { url } = await put(`profiles/${userId}/${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });
      return url;
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      throw error;
    }
  }

  // Delete files
  static async deleteFile(url: string) {
    try {
      await del(url);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  // List files for cleanup
  static async listFiles(prefix: string) {
    try {
      const { blobs } = await list({ prefix });
      return blobs;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }
} 