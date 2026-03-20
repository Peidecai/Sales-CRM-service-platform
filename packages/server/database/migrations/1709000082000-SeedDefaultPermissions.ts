import { MigrationInterface, QueryRunner } from 'typeorm'

const PERMISSIONS = [
  // customer module
  { code: 'customer:customer:list', name: '客户列表', resource: 'customer', action: 'list', module: 'customer', sort: 1 },
  { code: 'customer:customer:add', name: '新增客户', resource: 'customer', action: 'add', module: 'customer', sort: 2 },
  { code: 'customer:customer:edit', name: '编辑客户', resource: 'customer', action: 'edit', module: 'customer', sort: 3 },
  { code: 'customer:customer:delete', name: '删除客户', resource: 'customer', action: 'delete', module: 'customer', sort: 4 },
  { code: 'customer:customer:export', name: '导出客户', resource: 'customer', action: 'export', module: 'customer', sort: 5 },
  { code: 'customer:customer:import', name: '导入客户', resource: 'customer', action: 'import', module: 'customer', sort: 6 },
  { code: 'customer:contact:list', name: '联系人列表', resource: 'contact', action: 'list', module: 'customer', sort: 7 },
  { code: 'customer:contact:add', name: '新增联系人', resource: 'contact', action: 'add', module: 'customer', sort: 8 },
  // opportunity module
  { code: 'opportunity:opportunity:list', name: '商机列表', resource: 'opportunity', action: 'list', module: 'opportunity', sort: 1 },
  { code: 'opportunity:opportunity:add', name: '新增商机', resource: 'opportunity', action: 'add', module: 'opportunity', sort: 2 },
  { code: 'opportunity:opportunity:edit', name: '编辑商机', resource: 'opportunity', action: 'edit', module: 'opportunity', sort: 3 },
  { code: 'opportunity:opportunity:delete', name: '删除商机', resource: 'opportunity', action: 'delete', module: 'opportunity', sort: 4 },
  { code: 'opportunity:opportunity:export', name: '导出商机', resource: 'opportunity', action: 'export', module: 'opportunity', sort: 5 },
  // call-record module
  { code: 'call-record:record:list', name: '通话记录列表', resource: 'record', action: 'list', module: 'call-record', sort: 1 },
  { code: 'call-record:record:detail', name: '通话记录详情', resource: 'record', action: 'detail', module: 'call-record', sort: 2 },
  { code: 'call-record:record:export', name: '导出通话记录', resource: 'record', action: 'export', module: 'call-record', sort: 3 },
  // knowledge module
  { code: 'knowledge:article:list', name: '知识库列表', resource: 'article', action: 'list', module: 'knowledge', sort: 1 },
  { code: 'knowledge:article:add', name: '新增文章', resource: 'article', action: 'add', module: 'knowledge', sort: 2 },
  { code: 'knowledge:article:edit', name: '编辑文章', resource: 'article', action: 'edit', module: 'knowledge', sort: 3 },
  { code: 'knowledge:article:delete', name: '删除文章', resource: 'article', action: 'delete', module: 'knowledge', sort: 4 },
  { code: 'knowledge:article:publish', name: '发布文章', resource: 'article', action: 'publish', module: 'knowledge', sort: 5 },
  // system module
  { code: 'system:user:list', name: '用户列表', resource: 'user', action: 'list', module: 'system', sort: 1 },
  { code: 'system:user:add', name: '新增用户', resource: 'user', action: 'add', module: 'system', sort: 2 },
  { code: 'system:user:edit', name: '编辑用户', resource: 'user', action: 'edit', module: 'system', sort: 3 },
  { code: 'system:user:delete', name: '删除用户', resource: 'user', action: 'delete', module: 'system', sort: 4 },
  { code: 'system:role:list', name: '角色列表', resource: 'role', action: 'list', module: 'system', sort: 5 },
  { code: 'system:role:add', name: '新增角色', resource: 'role', action: 'add', module: 'system', sort: 6 },
  { code: 'system:role:edit', name: '编辑角色', resource: 'role', action: 'edit', module: 'system', sort: 7 },
  { code: 'system:role:delete', name: '删除角色', resource: 'role', action: 'delete', module: 'system', sort: 8 },
  { code: 'system:audit-log:list', name: '审计日志列表', resource: 'audit-log', action: 'list', module: 'system', sort: 9 },
  { code: 'system:audit-log:export', name: '导出审计日志', resource: 'audit-log', action: 'export', module: 'system', sort: 10 },
  // product module
  { code: 'product:product:list', name: '产品列表', resource: 'product', action: 'list', module: 'product', sort: 1 },
  { code: 'product:product:add', name: '新增产品', resource: 'product', action: 'add', module: 'product', sort: 2 },
  { code: 'product:product:edit', name: '编辑产品', resource: 'product', action: 'edit', module: 'product', sort: 3 },
  { code: 'product:product:delete', name: '删除产品', resource: 'product', action: 'delete', module: 'product', sort: 4 },
  { code: 'product:product:export', name: '导出产品', resource: 'product', action: 'export', module: 'product', sort: 5 },
]

// Permission codes for each built-in role
const ADMIN_PERMISSIONS = PERMISSIONS.map((p) => p.code)

const MANAGER_PERMISSIONS = PERMISSIONS.filter(
  (p) => !p.code.startsWith('system:') || p.code === 'system:audit-log:list',
).map((p) => p.code)

const SALES_PERMISSIONS = PERMISSIONS.filter(
  (p) =>
    !p.code.startsWith('system:') &&
    !p.action.includes('delete') &&
    !p.action.includes('export') &&
    !p.action.includes('import'),
).map((p) => p.code)

const ROLES = [
  { code: 'admin', name: '管理员', label: '超级管理员', isBuiltin: true },
  { code: 'manager', name: '主管', label: '销售主管', isBuiltin: true },
  { code: 'sales', name: '销售', label: '销售人员', isBuiltin: true },
]

export class SeedDefaultPermissions1709000082000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert permissions
    for (const p of PERMISSIONS) {
      await queryRunner.query(
        `INSERT IGNORE INTO sys_permissions (code, name, resource, action, module, sort) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.code, p.name, p.resource, p.action, p.module, p.sort],
      )
    }

    // Insert built-in roles
    for (const r of ROLES) {
      await queryRunner.query(
        `INSERT IGNORE INTO sys_roles (code, name, label, is_builtin) VALUES (?, ?, ?, ?)`,
        [r.code, r.name, r.label, r.isBuiltin ? 1 : 0],
      )
    }

    // Link roles to permissions
    const rolePermMap: Record<string, string[]> = {
      admin: ADMIN_PERMISSIONS,
      manager: MANAGER_PERMISSIONS,
      sales: SALES_PERMISSIONS,
    }

    for (const [roleCode, permCodes] of Object.entries(rolePermMap)) {
      const roleRows = await queryRunner.query(
        `SELECT id FROM sys_roles WHERE code = ?`,
        [roleCode],
      ) as { id: number }[]
      if (roleRows.length === 0) continue
      const roleId = roleRows[0].id

      for (const permCode of permCodes) {
        const permRows = await queryRunner.query(
          `SELECT id FROM sys_permissions WHERE code = ?`,
          [permCode],
        ) as { id: number }[]
        if (permRows.length === 0) continue
        const permId = permRows[0].id

        await queryRunner.query(
          `INSERT IGNORE INTO sys_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleId, permId],
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role-permission links for built-in roles
    for (const r of ROLES) {
      const roleRows = await queryRunner.query(
        `SELECT id FROM sys_roles WHERE code = ?`,
        [r.code],
      ) as { id: number }[]
      if (roleRows.length > 0) {
        await queryRunner.query(
          `DELETE FROM sys_role_permissions WHERE role_id = ?`,
          [roleRows[0].id],
        )
      }
    }

    // Remove seeded permissions
    for (const p of PERMISSIONS) {
      await queryRunner.query(`DELETE FROM sys_permissions WHERE code = ?`, [p.code])
    }

    // Remove built-in roles
    for (const r of ROLES) {
      await queryRunner.query(`DELETE FROM sys_roles WHERE code = ?`, [r.code])
    }
  }
}
