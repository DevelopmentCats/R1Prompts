import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Prompt } from './Prompt';

@Entity('prompt_metrics')
@Unique(['prompt', 'user'])
export class PromptMetrics {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Prompt, (prompt) => prompt.metrics, { onDelete: 'CASCADE' })
  prompt!: Prompt;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ default: 0 })
  views: number = 0;

  @Column({ default: 0 })
  copies: number = 0;

  @Column({ type: 'float', nullable: true })
  rating?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
