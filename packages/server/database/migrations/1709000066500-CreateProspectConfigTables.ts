import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateProspectConfigTables1709000066500 implements MigrationInterface {
  name = 'CreateProspectConfigTables1709000066500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── prospect_data_sources 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'prospect_data_sources',
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
            length: '50',
            isNullable: false,
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'api_key',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'api_secret',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'api_endpoint',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'is_enabled',
            type: 'tinyint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'daily_quota',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'used_today',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_used',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'last_called_at',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'config',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    // UNIQUE on channel
    await queryRunner.createIndex(
      'prospect_data_sources',
      new TableIndex({
        name: 'UQ_PROSPECT_DATA_SOURCES_CHANNEL',
        columnNames: ['channel'],
        isUnique: true,
      }),
    )

    // ── prospect_search_templates 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'prospect_search_templates',
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
            length: '100',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'conditions',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'is_shared',
            type: 'tinyint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'prospect_search_templates',
      new TableIndex({
        name: 'IDX_PROSPECT_SEARCH_TEMPLATES_USER_ID',
        columnNames: ['user_id'],
      }),
    )

    // ── prospect_filter_configs 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'prospect_filter_configs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'enabled_filters',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'custom_filters',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'updated_by',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    )

    // Insert singleton default config row (idempotent)
    await queryRunner.query(
      `INSERT IGNORE INTO prospect_filter_configs (id, enabled_filters, custom_filters, updated_by) ` +
        `VALUES (1, '["keyword","industry","province","city","registeredCapital","employeeCount","establishDate","businessStatus"]', '[]', 0)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse creation order
    await queryRunner.dropTable('prospect_filter_configs')

    await queryRunner.dropIndex('prospect_search_templates', 'IDX_PROSPECT_SEARCH_TEMPLATES_USER_ID')
    await queryRunner.dropTable('prospect_search_templates')

    await queryRunner.dropIndex('prospect_data_sources', 'UQ_PROSPECT_DATA_SOURCES_CHANNEL')
    await queryRunner.dropTable('prospect_data_sources')
  }
}
