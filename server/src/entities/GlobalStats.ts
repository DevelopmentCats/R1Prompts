import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('global_stats')
export class GlobalStats {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 0 })
  totalPromptsGenerated: number = 0;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
