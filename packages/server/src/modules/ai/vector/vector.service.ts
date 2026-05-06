import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import type BetterSqlite3 from 'better-sqlite3'
import { aiConfig } from '../ai.config'
import * as path from 'path'
import * as fs from 'fs'

export interface VectorSearchResult {
  articleId: number
  chunkIndex: number
  content: string
  similarity: number
}

@Injectable()
export class VectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorService.name)
  private db!: BetterSqlite3.Database

  onModuleInit() {
    const config = aiConfig()
    const dbPath = path.resolve(config.vectorDbPath)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof BetterSqlite3
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')

    // 向量库使用本地 SQLite，WAL 降低读写互相阻塞；生产替换向量引擎时保持接口不变即可。
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(article_id, chunk_index)
      );
      CREATE INDEX IF NOT EXISTS idx_vectors_article_id ON vectors(article_id);
    `)

    this.logger.log(`Vector DB initialized at ${dbPath}`)
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close()
      this.logger.log('Vector DB closed')
    }
  }

  /**
   * Upsert embedding vectors for an article (removes old entries first).
   */
  upsertArticleVectors(
    articleId: number,
    chunks: { content: string; embedding: number[] }[],
  ): void {
    const deleteStmt = this.db.prepare('DELETE FROM vectors WHERE article_id = ?')
    const insertStmt = this.db.prepare(
      'INSERT INTO vectors (article_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)',
    )

    // 先删后插必须在同一事务内完成，避免搜索读到同一文章的新旧分片混合状态。
    const transaction = this.db.transaction(() => {
      deleteStmt.run(articleId)
      chunks.forEach((chunk, index) => {
        insertStmt.run(articleId, index, chunk.content, JSON.stringify(chunk.embedding))
      })
    })

    transaction()
  }

  /**
   * Delete all vectors for a given article.
   */
  deleteArticleVectors(articleId: number): void {
    this.db.prepare('DELETE FROM vectors WHERE article_id = ?').run(articleId)
  }

  /**
   * Search vectors by cosine similarity against a query embedding.
   * Returns top-K results.
   */
  search(queryEmbedding: number[], topK = 5, minSimilarity = 0.3): VectorSearchResult[] {
    // 当前实现全量扫描并在内存计算相似度，适合小规模知识库；数据量增长后应换 ANN 索引。
    const rows = this.db
      .prepare('SELECT id, article_id, chunk_index, content, embedding FROM vectors')
      .all() as {
      id: number
      article_id: number
      chunk_index: number
      content: string
      embedding: string
    }[]

    const results: VectorSearchResult[] = []

    for (const row of rows) {
      const embedding = JSON.parse(row.embedding) as number[]
      const similarity = cosineSimilarity(queryEmbedding, embedding)

      if (similarity >= minSimilarity) {
        results.push({
          articleId: row.article_id,
          chunkIndex: row.chunk_index,
          content: row.content,
          similarity,
        })
      }
    }

    // 先按阈值过滤再取 topK，避免低相关片段进入 RAG 上下文。
    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  /**
   * Get total vector count (for monitoring).
   */
  getVectorCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM vectors').get() as { count: number }
    return row.count
  }
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}
