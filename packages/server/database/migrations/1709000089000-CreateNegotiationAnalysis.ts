import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateNegotiationAnalysis1709000089000 implements MigrationInterface {
  name = 'CreateNegotiationAnalysis1709000089000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'negotiation_analyses',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'call_record_id', type: 'int', isNullable: false },
          { name: 'customer_id', type: 'int', isNullable: true },
          { name: 'user_id', type: 'int', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          { name: 'overall_score', type: 'int', isNullable: true },
          { name: 'strategy', type: 'varchar', length: '50', isNullable: true },
          { name: 'concessions', type: 'json', isNullable: true },
          { name: 'key_moments', type: 'json', isNullable: true },
          { name: 'strengths', type: 'json', isNullable: true },
          { name: 'weaknesses', type: 'json', isNullable: true },
          { name: 're_negotiation_advice', type: 'text', isNullable: true },
          { name: 'outcome', type: 'varchar', length: '20', isNullable: true },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'raw_analysis', type: 'json', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'negotiation_analyses',
      new TableIndex({ name: 'IDX_neg_analysis_call_record', columnNames: ['call_record_id'], isUnique: true }),
    )
    await queryRunner.createIndex(
      'negotiation_analyses',
      new TableIndex({ name: 'IDX_neg_analysis_customer', columnNames: ['customer_id'] }),
    )
    await queryRunner.createIndex(
      'negotiation_analyses',
      new TableIndex({ name: 'IDX_neg_analysis_user', columnNames: ['user_id'] }),
    )
    await queryRunner.createIndex(
      'negotiation_analyses',
      new TableIndex({ name: 'IDX_neg_analysis_status', columnNames: ['status'] }),
    )
    await queryRunner.createIndex(
      'negotiation_analyses',
      new TableIndex({ name: 'IDX_neg_analysis_outcome', columnNames: ['outcome'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('negotiation_analyses', true)
  }
}
