import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAgentStatusLogsTable1709000035000 implements MigrationInterface {
  name = 'CreateAgentStatusLogsTable1709000035000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_status_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'agent_id',
            type: 'int',
            isNullable: false,
            comment: '坐席ID',
          },
          {
            name: 'from_status',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'to_status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'agent_status_logs',
      new TableIndex({ name: 'IDX_agent_status_logs_agent_id', columnNames: ['agent_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('agent_status_logs', 'IDX_agent_status_logs_agent_id')
    await queryRunner.dropTable('agent_status_logs')
  }
}
