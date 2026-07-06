#!/usr/bin/env node
/**
 * 기구 상품 시드 → DynamoDB + S3
 * 사용: bash scripts/aws/mc-catalog-seed.sh
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { MC_CATALOG, LEGACY_SEED_IDS } from "./mc-catalog-data.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const REGION = process.env.AWS_REGION ?? "ap-northeast-2";
const TABLE = process.env.PRODUCTS_TABLE ?? "golgius-products";
const BUCKET = process.env.MEDIA_BUCKET ?? "golgius-web-624627264933";
const IMAGE_DIR = process.env.MC_IMAGE_DIR ?? "/tmp/mc-products";
const MEDIA_PREFIX = "media/products/";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({ region: REGION });

async function uploadImage(productId) {
  const local = join(IMAGE_DIR, `${productId}.jpg`);
  if (!existsSync(local)) return [];
  const key = `${MEDIA_PREFIX}mc/${productId}.jpg`;
  const body = readFileSync(local);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "public,max-age=31536000,immutable",
    }),
  );
  return [`/${key}`];
}

async function deleteItem(id) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
}

async function removeLegacy() {
  for (const id of LEGACY_SEED_IDS) {
    await deleteItem(id).catch(() => {});
    console.log(`  삭제(레거시): ${id}`);
  }
}

async function main() {
  const now = new Date().toISOString();
  console.log(`== 기구 상품 시드 → ${TABLE} (${MC_CATALOG.length}개) ==`);

  await removeLegacy();

  let ok = 0;
  for (const raw of MC_CATALOG) {
    const images = await uploadImage(raw.id);
    const product = {
      id: raw.id,
      name: raw.name,
      category: raw.category,
      brand: raw.brand,
      price: raw.price,
      summary: raw.summary,
      specs: raw.specs,
      images,
      featured: raw.featured,
      status: raw.status,
      createdAt: now,
      updatedAt: now,
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: product }));
    ok++;
    if (ok % 20 === 0) console.log(`  …${ok}/${MC_CATALOG.length}`);
  }
  console.log(`완료: ${ok}개 상품 등록 (이미지 ${MC_CATALOG.filter((p) => existsSync(join(IMAGE_DIR, `${p.id}.jpg`))).length}개)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
