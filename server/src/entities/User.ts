import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Prompt } from './Prompt';
import { Encryption } from '../utils/encryption';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '2c78d8648c4f7975f4c98b3b07f65c476f4a79995f48cde3377f8e4c84e89d23';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ 
    unique: true,
    transformer: {
      from: (value: string) => {
        if (!value) return '';
        
        // Remove the 'encrypted:' prefix if it exists
        const cleanValue = value.replace('encrypted:', '');
        
        // If it's a hex string (encrypted), decrypt it
        if (/^[0-9a-f]{64,}$/i.test(cleanValue)) {
          return Encryption.decryptForLookup(cleanValue);
        }
        
        // If it's not a hex string, it's probably already decrypted
        return cleanValue;
      },
      to: (value: string) => {
        if (!value) return '';
        try {
          // If it's already an encrypted value (hex string), keep it
          if (/^[0-9a-f]{64,}$/i.test(value)) {
            return value;
          }
          // For new/updated emails, just encrypt them without prefix
          return Encryption.encryptForLookup(value.toLowerCase());
        } catch (error) {
          console.error('Error encrypting email:', error);
          throw new Error('Failed to encrypt email');
        }
      }
    }
  })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  avatarUrl: string = '';

  @Column({ default: true })
  emailNotifications: boolean = true;

  @Column({ default: true })
  darkMode: boolean = true;

  @Column({ default: false })
  isAdmin: boolean = false;

  @OneToMany(() => Prompt, (prompt) => prompt.author, {
    cascade: true,
    lazy: true
  })
  prompts!: Prompt[];

  @Column({ default: 0 })
  promptsGenerated: number = 0;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
