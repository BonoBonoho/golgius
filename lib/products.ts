// 기구 쇼핑몰 상품 저장소 — AWS DynamoDB + S3(이미지).
// 운영(EC2): 인스턴스 프로파일 자격증명 자동 사용. 로컬: default AWS 프로필(bono-cli).
// PRODUCTS_TABLE 미설정 시 메모리 폴백(기존 lib/orders.ts 패턴).
//
// 환경변수:
//   PRODUCTS_TABLE  DynamoDB 테이블명 (예: golgius-products)
//   MEDIA_BUCKET    이미지 S3 버킷 (예: golgius-web-624627264933) — media/products/* 에 저장
//   AWS_REGION      기본 ap-northeast-2

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number | null; // null = 견적 문의
  summary: string;
  specs: ProductSpec[];
  images: string[]; // "/media/products/..." (CloudFront 경로)
  featured: boolean;
  status: "active" | "hidden";
  createdAt: string;
  updatedAt: string;
}

export type NewProduct = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export const PRODUCT_CATEGORIES = [
  "웨이트 머신",
  "유산소",
  "프리웨이트",
  "액세서리",
] as const;

const REGION = process.env.AWS_REGION ?? "ap-northeast-2";
const TABLE = (process.env.PRODUCTS_TABLE ?? "").trim();
const BUCKET = (process.env.MEDIA_BUCKET ?? "").trim();
const MEDIA_PREFIX = "media/products/";

export function isProductsPersistent(): boolean {
  return TABLE.length > 0;
}

let ddbDoc: DynamoDBDocumentClient | null = null;
function ddb(): DynamoDBDocumentClient {
  if (!ddbDoc) {
    ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbDoc;
}

let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) s3Client = new S3Client({ region: REGION });
  return s3Client;
}

// ── 메모리 폴백 ─────────────────────────────────────────
const mem: Product[] = ((globalThis as Record<string, unknown>).__golgiusProducts ??=
  []) as Product[];

function toProduct(r: Record<string, unknown>): Product {
  const rawSpecs = Array.isArray(r.specs) ? (r.specs as Record<string, unknown>[]) : [];
  const rawImages = Array.isArray(r.images) ? (r.images as unknown[]) : [];
  const price =
    typeof r.price === "number" && Number.isFinite(r.price) ? r.price : null;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    category: String(r.category ?? ""),
    brand: String(r.brand ?? ""),
    price,
    summary: String(r.summary ?? ""),
    specs: rawSpecs
      .map((s) => ({ label: String(s.label ?? ""), value: String(s.value ?? "") }))
      .filter((s) => s.label),
    images: rawImages.map(String).filter(Boolean),
    featured: r.featured === true,
    status: r.status === "hidden" ? "hidden" : "active",
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    updatedAt: String(r.updatedAt ?? r.createdAt ?? new Date().toISOString()),
  };
}

// ── 조회 ────────────────────────────────────────────────
export async function getProducts(opts?: { includeHidden?: boolean }): Promise<Product[]> {
  const includeHidden = opts?.includeHidden === true;
  let rows: Product[];

  if (isProductsPersistent()) {
    const items: Record<string, unknown>[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const res = await ddb().send(
        new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey })
      );
      items.push(...((res.Items ?? []) as Record<string, unknown>[]));
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    rows = items.map(toProduct);
  } else {
    rows = [...mem];
  }

  if (!includeHidden) rows = rows.filter((p) => p.status === "active");
  // featured 우선 → 최신순
  return rows.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!id) return null;
  if (isProductsPersistent()) {
    const res = await ddb().send(new GetCommand({ TableName: TABLE, Key: { id } }));
    return res.Item ? toProduct(res.Item as Record<string, unknown>) : null;
  }
  return mem.find((p) => p.id === id) ?? null;
}

// ── 등록·수정·삭제 ──────────────────────────────────────
export async function saveProduct(input: NewProduct & { id?: string }): Promise<Product> {
  const now = new Date().toISOString();
  const existing = input.id ? await getProduct(input.id) : null;
  const product: Product = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    category: input.category,
    brand: input.brand,
    price: input.price,
    summary: input.summary,
    specs: input.specs,
    images: input.images,
    featured: input.featured,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (isProductsPersistent()) {
    await ddb().send(new PutCommand({ TableName: TABLE, Item: product }));
    return product;
  }
  const i = mem.findIndex((p) => p.id === product.id);
  if (i >= 0) mem[i] = product;
  else mem.unshift(product);
  return product;
}

export async function setProductStatus(
  id: string,
  status: "active" | "hidden"
): Promise<void> {
  const p = await getProduct(id);
  if (!p) return;
  await saveProduct({ ...p, status });
}

export async function deleteProduct(id: string): Promise<void> {
  const p = await getProduct(id);
  if (isProductsPersistent()) {
    await ddb().send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
  } else {
    const i = mem.findIndex((x) => x.id === id);
    if (i >= 0) mem.splice(i, 1);
  }
  // 연결 이미지 정리 (실패해도 무시 — 고아 객체는 수동 정리 가능)
  if (p) await Promise.allSettled(p.images.map((img) => deleteProductImage(img)));
}

// ── 이미지 (S3 media/products/*, CloudFront /media/* 서빙) ──
export async function uploadProductImage(file: File): Promise<string | null> {
  if (!BUCKET) return null;
  const ext = (file.name.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const key = `${MEDIA_PREFIX}${crypto.randomUUID()}.${ext || "bin"}`;
  const body = Buffer.from(await file.arrayBuffer());
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public,max-age=31536000,immutable",
    })
  );
  return `/${key}`;
}

export async function deleteProductImage(path: string): Promise<void> {
  if (!BUCKET) return;
  const key = path.replace(/^\//, "");
  if (!key.startsWith(MEDIA_PREFIX)) return; // 다른 경로 삭제 방지
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // ignore
  }
}
