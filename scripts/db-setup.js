#!/usr/bin/env node

import { createPool } from '@vercel/postgres';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

// Migration directory
const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'server', 'migrations');

/**
 * Run database migrations in order
 */
async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Create database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
      throw new Error('No database connection string found in environment variables');
    }

    const pool = createPool({ connectionString });

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Get list of already applied migrations
    const appliedResult = await pool.query('SELECT name FROM migrations ORDER BY id');
    const appliedMigrations = appliedResult.rows.map(row => row.name);

    // Get all migration files
    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order

    // Apply each migration that hasn't been applied yet
    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (appliedMigrations.includes(file)) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }

      // Read and execute the migration
      console.log(`Applying migration: ${file}`);
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

      // Execute the migration in a transaction
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        appliedCount++;
        console.log(`Migration ${file} applied successfully`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw new Error(`Failed to apply migration ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`Database setup complete. Applied ${appliedCount} new migrations.`);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
