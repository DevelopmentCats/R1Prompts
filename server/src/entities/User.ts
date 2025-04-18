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
        
        // If it's an encrypted hex string (matches a pattern of all hex chars)
        if (/^[0-9a-f]{32,}$/i.test(value)) {
          // Just return the value as is - for database lookups
          return value;
        }
        
        // Return unencrypted value
        return value;
      },
      to: (value: string) => {
        if (!value) return '';
        
        // If it's already a hex string (likely encrypted), keep it as is
        if (/^[0-9a-f]{32,}$/i.test(value)) {
          return value;
        }
        
        // For login/lookup purposes, return the encrypted value
        try {
          // Always encrypt with lowercase normalization for consistency
          return Encryption.encryptForLookup(value.toLowerCase());
        } catch (error) {
          console.error('Error encrypting email:', error);
          return value; // Return original value in case of error
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
