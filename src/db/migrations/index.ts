import { db } from '../index'
import type { Account, Transaction, Category } from '../../types'

// Migration registry: maps from-version to migration function
type MigrationFn = () => Promise<void>
const migrations: Record<number, MigrationFn> = {
  // 1: v1_to_v2 migration would be registered here when schema v2 is defined
}

export async function runMigrations(currentVersion: number): Promise<void> {
  let version = currentVersion
  const targetVersion = 1 // current app schema version

  while (version < targetVersion) {
    const migFn = migrations[version]
    if (!migFn) throw new Error(`No migration found for v${version} → v${version + 1}`)
    await migFn()
    version++
    await db.meta.update(1, { schema_version: version })
  }
}

// Import JSON backup and run migrations if needed
export async function importWithMigration(data: {
  schema_version: number
  accounts: unknown[]
  transactions: unknown[]
  categories: unknown[]
}): Promise<void> {
  const { schema_version } = data
  if (schema_version > 1) throw new Error('Unsupported schema version: ' + schema_version)

  // Atomic: write all or nothing using a transaction
  await db.transaction('rw', [db.accounts, db.transactions, db.categories, db.meta], async () => {
    await db.accounts.clear()
    await db.transactions.clear()
    await db.categories.clear()
    await db.accounts.bulkAdd(data.accounts as Account[])
    await db.transactions.bulkAdd(data.transactions as Transaction[])
    await db.categories.bulkAdd(data.categories as Category[])
    await db.meta.update(1, { schema_version: 1 })
  })
}
