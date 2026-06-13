import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMaterialFilesTable1709000048000 implements MigrationInterface {
  name = 'CreateMaterialFilesTable1709000048000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'material_files',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'oss_key',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'oss_bucket',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'md5',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'thumbnail_key',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'duration_seconds',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'extra_meta',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
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
      'material_files',
      new TableIndex({ name: 'IDX_MATERIAL_FILES_OSS_KEY', columnNames: ['oss_key'] }),
    );
    await queryRunner.createIndex(
      'material_files',
      new TableIndex({ name: 'IDX_MATERIAL_FILES_MD5', columnNames: ['md5'] }),
    );
    await queryRunner.createIndex(
      'material_files',
      new TableIndex({ name: 'IDX_MATERIAL_FILES_CATEGORY', columnNames: ['category'] }),
    );
    await queryRunner.createIndex(
      'material_files',
      new TableIndex({ name: 'IDX_MATERIAL_FILES_CREATED_AT', columnNames: ['created_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('material_files', 'IDX_MATERIAL_FILES_CREATED_AT');
    await queryRunner.dropIndex('material_files', 'IDX_MATERIAL_FILES_CATEGORY');
    await queryRunner.dropIndex('material_files', 'IDX_MATERIAL_FILES_MD5');
    await queryRunner.dropIndex('material_files', 'IDX_MATERIAL_FILES_OSS_KEY');
    await queryRunner.dropTable('material_files');
  }
}
