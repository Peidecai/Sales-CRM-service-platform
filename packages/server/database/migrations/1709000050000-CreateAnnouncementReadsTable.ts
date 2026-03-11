import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateAnnouncementReadsTable1709000050000 implements MigrationInterface {
  name = 'CreateAnnouncementReadsTable1709000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'announcement_reads',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'announcement_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'read_at',
            type: 'datetime',
            length: '6',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    );
    await queryRunner.createUniqueConstraint(
      'announcement_reads',
      new TableUnique({
        name: 'UQ_ANNOUNCEMENT_READS_ANN_USER',
        columnNames: ['announcement_id', 'user_id'],
      }),
    );
    await queryRunner.createIndex(
      'announcement_reads',
      new TableIndex({ name: 'IDX_ANNOUNCEMENT_READS_ANN', columnNames: ['announcement_id'] }),
    );
    await queryRunner.createIndex(
      'announcement_reads',
      new TableIndex({ name: 'IDX_ANNOUNCEMENT_READS_USER', columnNames: ['user_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('announcement_reads', 'IDX_ANNOUNCEMENT_READS_USER');
    await queryRunner.dropIndex('announcement_reads', 'IDX_ANNOUNCEMENT_READS_ANN');
    await queryRunner.dropUniqueConstraint('announcement_reads', 'UQ_ANNOUNCEMENT_READS_ANN_USER');
    await queryRunner.dropTable('announcement_reads');
  }
}
