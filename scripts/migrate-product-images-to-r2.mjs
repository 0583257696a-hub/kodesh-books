import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DEFAULT_DATABASE = 'kodesh-books-db-v2';
const DEFAULT_BUCKET = 'kodesh-books-product-images-v2';
const DEFAULT_PUBLIC_PREFIX = '/api/images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, '').split('=');
    return [key, valueParts.length ? valueParts.join('=') : 'true'];
  })
);

const database = args.get('database') || DEFAULT_DATABASE;
const bucket = args.get('bucket') || DEFAULT_BUCKET;
const publicPrefix = (args.get('public-prefix') || DEFAULT_PUBLIC_PREFIX).replace(/\/+$/, '');
const dryRun = args.has('dry-run');
const limit = Number.parseInt(args.get('limit') || '0', 10);
const startedAt = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve('.migration-backups');
const tempDir = path.join(tmpdir(), `kodesh-books-r2-images-${startedAt}`);
const wranglerLogPath = path.resolve('.migration-tmp', 'wrangler-logs');

function findCachedWrangler() {
  if (args.get('wrangler')) return { command: args.get('wrangler'), prefix: [] };
  if (process.env.WRANGLER_BIN) return { command: process.env.WRANGLER_BIN, prefix: [] };

  if (process.platform === 'win32') {
    const npxCache = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
    if (existsSync(npxCache)) {
      const candidates = readdirSync(npxCache, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(npxCache, entry.name, 'node_modules', '.bin', 'wrangler.cmd'))
        .filter((candidate) => existsSync(candidate))
        .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

      if (candidates[0]) {
        const nodeModulesDir = path.dirname(path.dirname(candidates[0]));
        const cliPath = path.join(nodeModulesDir, 'wrangler', 'wrangler-dist', 'cli.js');
        if (existsSync(cliPath)) return { command: process.execPath, prefix: [cliPath] };
        return { command: candidates[0], prefix: [] };
      }
    }

    return { command: 'npx.cmd', prefix: ['wrangler'] };
  }

  return { command: 'npx', prefix: ['wrangler'] };
}

const wrangler = findCachedWrangler();

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: wranglerLogPath,
    },
    ...options,
  });

  if (result.status !== 0) {
    const spawnError = result.error?.message;
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(`${command} ${commandArgs.join(' ')} failed\n${spawnError || stderr || stdout || 'No output'}`);
  }

  return result.stdout;
}

function d1Json(sql) {
  const output = run(wrangler.command, [
    ...wrangler.prefix,
    'd1',
    'execute',
    database,
    '--remote',
    '--json',
    '--command',
    sql.replace(/\s+/g, ' ').trim(),
  ]);
  const jsonStart = output.indexOf('[');
  if (jsonStart === -1) {
    throw new Error(`Wrangler did not return JSON:\n${output}`);
  }
  return JSON.parse(output.slice(jsonStart))[0]?.results || [];
}

function d1Exec(sql) {
  const sqlFile = path.join(tempDir, `exec-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`);
  writeFileSync(sqlFile, sql);
  run(wrangler.command, [
    ...wrangler.prefix,
    'd1',
    'execute',
    database,
    '--remote',
    '--file',
    sqlFile,
  ]);
}

function sqlString(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function sanitize(value, fallback = 'item') {
  const safe = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return safe || fallback;
}

function extensionFromContentType(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (!match) return '';
    return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  } catch {
    return '';
  }
}

function contentTypeFromExtension(ext) {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function fileNameFromUrl(url, fallback) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return sanitize(name.replace(/\.[^.]+$/, ''), fallback);
  } catch {
    return fallback;
  }
}

function buildImageKey(record, contentType) {
  const ext = extensionFromUrl(record.image_url) || extensionFromContentType(contentType);
  const productPart = sanitize(record.product_id, 'unassigned-product');
  const idPart = sanitize(record.id, 'image');
  const namePart = fileNameFromUrl(record.image_url, 'image');
  return `products_${productPart}_migrated_${idPart}_${namePart}.${ext}`;
}

function publicImageUrl(key) {
  return `${publicPrefix}/${encodeURIComponent(key)}`;
}

function buildQuery() {
  const limitSql = Number.isFinite(limit) && limit > 0 ? ` LIMIT ${limit}` : '';
  return `
    SELECT
      pi.id,
      pi.product_id,
      pi.image_url,
      pi.image_key,
      pi.alt_text,
      pi.file_name,
      pi.content_type,
      pi.image_role,
      pi.sort_order,
      p.image_url AS product_image_url,
      p.gallery_urls_json
    FROM product_images pi
    LEFT JOIN products p ON p.id = pi.product_id
    WHERE instr(pi.image_url, 'base44') > 0
    ORDER BY pi.product_id, pi.sort_order, pi.id
    ${limitSql};
  `;
}

async function downloadImage(record) {
  const response = await fetch(record.image_url, {
    headers: {
      'user-agent': 'kodesh-books-r2-migration/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed with ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large: ${buffer.length} bytes`);
  }

  const urlExt = extensionFromUrl(record.image_url);
  const responseType = response.headers.get('content-type') || '';
  const contentType = responseType.startsWith('image/')
    ? responseType.split(';')[0]
    : contentTypeFromExtension(urlExt);

  return { buffer, contentType };
}

function uploadToR2(key, filePath, contentType) {
  run(wrangler.command, [
    ...wrangler.prefix,
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    '--remote',
    '--force',
    '--file',
    filePath,
    '--content-type',
    contentType,
    '--cache-control',
    'public, max-age=31536000, immutable',
  ]);
}

function updateD1(record, key, imageUrl, contentType) {
  const now = new Date().toISOString();
  const fileName = key.split('_').slice(5).join('_') || key;
  const oldUrl = record.image_url;

  d1Exec(`
    UPDATE product_images
    SET
      base44_url = COALESCE(NULLIF(base44_url, ''), ${sqlString(oldUrl)}),
      image_key = ${sqlString(key)},
      image_url = ${sqlString(imageUrl)},
      file_name = COALESCE(NULLIF(file_name, ''), ${sqlString(fileName)}),
      content_type = ${sqlString(contentType)},
      updated_at = ${sqlString(now)}
    WHERE id = ${sqlString(record.id)}
      AND image_url = ${sqlString(oldUrl)};

    UPDATE products
    SET image_url = ${sqlString(imageUrl)}, updated_at = ${sqlString(now)}
    WHERE id = ${sqlString(record.product_id)}
      AND image_url = ${sqlString(oldUrl)};

    UPDATE products
    SET gallery_urls_json = replace(gallery_urls_json, ${sqlString(oldUrl)}, ${sqlString(imageUrl)}),
        updated_at = ${sqlString(now)}
    WHERE id = ${sqlString(record.product_id)}
      AND instr(gallery_urls_json, ${sqlString(oldUrl)}) > 0;
  `);
}

async function main() {
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(wranglerLogPath, { recursive: true });
  const records = d1Json(buildQuery());
  mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `product-images-base44-${startedAt}.json`);
  writeFileSync(backupPath, JSON.stringify({ database, bucket, dryRun, records }, null, 2));

  console.log(`Found ${records.length} Base44 product image URLs.`);
  console.log(`Backup written to ${backupPath}`);

  if (dryRun) {
    for (const record of records.slice(0, 10)) {
      console.log(`[dry-run] ${record.id} -> ${publicImageUrl(buildImageKey(record, record.content_type || 'image/jpeg'))}`);
    }
    return;
  }

  let migrated = 0;
  const failures = [];

  for (const record of records) {
    try {
      const { buffer, contentType } = await downloadImage(record);
      const key = buildImageKey(record, contentType);
      const imageUrl = publicImageUrl(key);
      const filePath = path.join(tempDir, key);

      writeFileSync(filePath, buffer);
      uploadToR2(key, filePath, contentType);
      updateD1(record, key, imageUrl, contentType);

      migrated += 1;
      console.log(`[ok] ${record.id} -> ${imageUrl}`);
    } catch (error) {
      failures.push({ id: record.id, image_url: record.image_url, error: error.message });
      console.error(`[failed] ${record.id}: ${error.message}`);
    }
  }

  rmSync(tempDir, { recursive: true, force: true });

  if (failures.length) {
    const failurePath = path.join(backupDir, `product-images-base44-failures-${startedAt}.json`);
    writeFileSync(failurePath, JSON.stringify(failures, null, 2));
    console.error(`Migrated ${migrated}; failed ${failures.length}. Failure log: ${failurePath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Migrated ${migrated} product images to R2.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
