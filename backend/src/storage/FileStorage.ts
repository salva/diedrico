import fs from 'fs/promises';
import path from 'path';

/**
 * File-based storage for JSON data
 */
export class FileStorage {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  /**
   * Ensure data directory exists
   */
  async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }

  /**
   * Read JSON file
   */
  async readJSON<T>(filename: string): Promise<T> {
    try {
      const filePath = path.join(this.dataDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`);
      }
      throw new Error(`Failed to read file ${filename}: ${error.message}`);
    }
  }

  /**
   * Write JSON file
   */
  async writeJSON<T>(filename: string, data: T): Promise<void> {
    try {
      await this.ensureDir();
      const filePath = path.join(this.dataDir, filename);
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write file ${filename}: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`);
      }
      throw new Error(`Failed to delete file ${filename}: ${error.message}`);
    }
  }

  /**
   * List all JSON files in directory
   */
  async listFiles(): Promise<string[]> {
    try {
      await this.ensureDir();
      const files = await fs.readdir(this.dataDir);
      return files.filter(f => f.endsWith('.json'));
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async exists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
