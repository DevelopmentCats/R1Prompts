import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Prompt } from './Prompt';

@Entity('anonymous_prompt_copy')
@Index(['promptId', 'ipHash'], { unique: true }) // Ensure each IP can only copy a prompt once
export class AnonymousPromptCopy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Prompt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promptId' })
  prompt!: Prompt;

  @Column()
  @Index()
  promptId!: string;

  @Column()
  @Index()
  ipHash!: string;  // Hashed IP address for privacy

  @CreateDateColumn()
  createdAt!: Date;
}
