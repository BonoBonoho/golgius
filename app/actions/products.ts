"use server";

// 어드민 상품 관리 액션 — 등록·수정·상태 토글·삭제·이미지 업로드(S3 media/products/*)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/admin";
import {
  saveProduct,
  getProduct,
  setProductStatus,
  deleteProduct as removeProduct,
  uploadProductImage,
  deleteProductImage,
  PRODUCT_CATEGORIES,
  PRODUCT_BODY_PARTS,
  PRODUCT_DRIVE_TYPES,
  type ProductSpec,
} from "@/lib/products";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

export interface ProductFormState {
  ok: boolean;
  message: string;
}

// "라벨: 값" 줄 단위 텍스트 → specs 배열
function parseSpecs(raw: string): ProductSpec[] {
  return raw
    .split("\n")
    .map((line) => {
      const i = line.indexOf(":");
      if (i <= 0) return null;
      const label = line.slice(0, i).trim().slice(0, 40);
      const value = line.slice(i + 1).trim().slice(0, 120);
      return label && value ? { label, value } : null;
    })
    .filter((s): s is ProductSpec => s !== null)
    .slice(0, 20);
}

export async function upsertProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  if (!(await isAuthed())) return { ok: false, message: "권한이 없습니다." };

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const category = String(formData.get("category") ?? "").trim();
  const bodyPartRaw = String(formData.get("bodyPart") ?? "").trim();
  const bodyPart = (PRODUCT_BODY_PARTS as readonly string[]).includes(bodyPartRaw)
    ? bodyPartRaw
    : "";
  const bodyDetail = String(formData.get("bodyDetail") ?? "").trim().slice(0, 60);
  const driveTypeRaw = String(formData.get("driveType") ?? "").trim();
  const driveType = (PRODUCT_DRIVE_TYPES as readonly string[]).includes(driveTypeRaw)
    ? driveTypeRaw
    : "";
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 60);
  const priceRaw = String(formData.get("price") ?? "").replace(/[^0-9]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 500);
  const specs = parseSpecs(String(formData.get("specs") ?? ""));
  const featured = formData.get("featured") === "on";
  const status = formData.get("status") === "hidden" ? ("hidden" as const) : ("active" as const);

  if (name.length < 2) return { ok: false, message: "상품명을 2자 이상 입력해 주세요." };
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category))
    return { ok: false, message: "카테고리를 선택해 주세요." };
  if (!summary) return { ok: false, message: "요약 설명을 입력해 주세요." };

  // 기존 이미지 유지 + 신규 업로드
  const existing = id ? await getProduct(id) : null;
  const images = [...(existing?.images ?? [])];

  const file = formData.get("image");
  if (file && file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES)
      return { ok: false, message: "이미지는 4MB 이하만 업로드할 수 있습니다." };
    if (!file.type.startsWith("image/"))
      return { ok: false, message: "이미지 파일만 업로드할 수 있습니다." };
    try {
      const path = await uploadProductImage(file);
      if (path) images.unshift(path);
    } catch {
      return { ok: false, message: "이미지 업로드에 실패했습니다." };
    }
  }

  try {
    await saveProduct({ id, name, category, bodyPart, bodyDetail, driveType, brand, price, summary, specs, images: images.slice(0, 5), featured, status });
  } catch {
    return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/gym/shop");
  redirect("/admin/products");
}

export async function toggleProductStatus(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!id || (to !== "active" && to !== "hidden")) return;
  await setProductStatus(id, to);
  revalidatePath("/admin/products");
  revalidatePath("/gym/shop");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeProduct(id);
  revalidatePath("/admin/products");
  revalidatePath("/gym/shop");
}

export async function removeProductImage(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id || !path) return;
  const p = await getProduct(id);
  if (!p) return;
  await saveProduct({ ...p, images: p.images.filter((img) => img !== path) });
  await deleteProductImage(path);
  revalidatePath("/admin/products");
  revalidatePath("/gym/shop");
}
