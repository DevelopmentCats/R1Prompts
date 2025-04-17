import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Prompt } from './Prompt';

@Entity('prompt_copies')
@Unique(['promptId', 'userId']) // Ensure a user can only copy a prompt once
export class PromptCopy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  promptId!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => Prompt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promptId' })
  prompt!: Prompt;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
