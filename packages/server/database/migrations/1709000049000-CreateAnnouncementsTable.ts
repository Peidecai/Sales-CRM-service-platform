import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAnnouncementsTable1709000049000 implements MigrationInterface {
  name = 'CreateAnnouncementsTable1709000049000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'announcements',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['normal', 'important', 'urgent'],
            default: "'normal'",
          },
          {
            name: 'is_pinned',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'publish_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'end_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'announcements',
      new TableIndex({ name: 'IDX_ANNOUNCEMENTS_PUBLISH_AT', columnNames: ['publish_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('announcements', 'IDX_ANNOUNCEMENTS_PUBLISH_AT');
    await queryRunner.dropTable('announcements');
  }
}
