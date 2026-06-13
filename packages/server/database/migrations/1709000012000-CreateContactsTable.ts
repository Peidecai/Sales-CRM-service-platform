import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateContactsTable1709000012000 implements MigrationInterface {
  name = 'CreateContactsTable1709000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contacts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
            comment: '关联客户ID',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '联系人姓名',
          },
          {
            name: 'gender',
            type: 'enum',
            enum: ['male', 'female', 'unknown'],
            default: "'unknown'",
            comment: '性别',
          },
          {
            name: 'mobile',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: '手机号',
          },
          {
            name: 'landline',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: '座机',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '邮箱',
          },
          {
            name: 'wechat',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '微信号',
          },
          {
            name: 'department',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '部门',
          },
          {
            name: 'position',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '职位',
          },
          {
            name: 'decision_role',
            type: 'enum',
            enum: ['decision_maker', 'influencer', 'user', 'gatekeeper'],
            isNullable: true,
            comment: '决策角色',
          },
          {
            name: 'influence_level',
            type: 'tinyint',
            isNullable: true,
            comment: '影响力等级(1-5)',
          },
          {
            name: 'is_primary',
            type: 'boolean',
            default: false,
            comment: '是否主联系人',
          },
          {
            name: 'birthday',
            type: 'date',
            isNullable: true,
            comment: '生日',
          },
          {
            name: 'hobby',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '爱好',
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
            comment: '备注',
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
            name: 'deleted',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({ name: 'IDX_CONTACTS_CUSTOMER_ID', columnNames: ['customer_id'] }),
    );
    await queryRunner.createIndex(
      'contacts',
      new TableIndex({ name: 'IDX_CONTACTS_MOBILE', columnNames: ['mobile'] }),
    );
    await queryRunner.createIndex(
      'contacts',
      new TableIndex({ name: 'IDX_CONTACTS_EMAIL', columnNames: ['email'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_EMAIL');
    await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_MOBILE');
    await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_CUSTOMER_ID');
    await queryRunner.dropTable('contacts');
  }
}
