import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAppVersions1709000073000 implements MigrationInterface {
  name = 'CreateAppVersions1709000073000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'app_versions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            comment: '版本号 (semver)',
          },
          {
            name: 'build_number',
            type: 'int',
            comment: '构建号',
          },
          {
            name: 'platform',
            type: 'enum',
            enum: ['android', 'ios', 'all'],
            default: "'all'",
            comment: '平台',
          },
          {
            name: 'download_url',
            type: 'varchar',
            length: '500',
            comment: '下载地址',
          },
          {
            name: 'description',
            type: 'text',
            comment: '更新描述',
          },
          {
            name: 'force_update',
            type: 'boolean',
            default: false,
            comment: '是否强制更新',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'min_version',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: '最低支持版本',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'app_versions',
      new TableIndex({
        name: 'IDX_app_versions_build_number',
        columnNames: ['build_number'],
      }),
    )

    await queryRunner.createIndex(
      'app_versions',
      new TableIndex({
        name: 'IDX_app_versions_platform',
        columnNames: ['platform'],
      }),
    )

    await queryRunner.createIndex(
      'app_versions',
      new TableIndex({
        name: 'IDX_app_versions_is_active',
        columnNames: ['is_active'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('app_versions', true)
  }
}
