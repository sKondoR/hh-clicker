import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { HHCredentials } from '../types/hh-types';

const STORAGE_FILE = path.join(process.cwd(), '.hh_credentials.enc');

class Storage {
  private encryptionKey: Buffer;
  
  constructor() {
    // В реальном приложении ключ должен быть более защищённым
    const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || 'fallback_key_for_demo';
    this.encryptionKey = crypto.scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async saveCredentials(credentials: HHCredentials): Promise<void> {
    const encryptedCredentials = this.encrypt(JSON.stringify(credentials));
    await fs.writeFile(STORAGE_FILE, encryptedCredentials, 'utf8');
  }

  async loadCredentials(): Promise<HHCredentials | null> {
    try {
      const encryptedData = await fs.readFile(STORAGE_FILE, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData) as HHCredentials;
    } catch (error) {
      // Файл может не существовать или быть недоступен
      return null;
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      await fs.unlink(STORAGE_FILE);
    } catch (error) {
      // Файл может не существовать
    }
  }
}

export default new Storage();