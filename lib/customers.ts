// 표준 고객 레코드 — 외부 워크스페이스(Milestone X 등)가 매핑하기 좋게 정규화.
// 리드의 message에 묶여 있던 [업체명]/[관심 품목]을 구조화 필드로 분리한다.

import { getLeads, type Lead, type Stage } from "@/lib/leads";

export interface Customer {
  id: string; // 리드 id (외부에서 멱등 매핑 키로 사용)
  type: "lead";
  company: string; // 업체명
  contactName: string; // 담당자
  phone: string;
  email: string;
  region: string;
  vertical: "gym" | "hospital";
  stage: Stage;
  source: string; // 유입 경로
  interests: string[]; // 관심 품목
  note: string; // 순수 문의 내용(업체명/관심품목 라인 제외)
  createdAt: string;
  updatedAt: string;
}

function parseMessage(msg: string): { company: string; interests: string[]; note: string } {
  let company = "";
  const interests: string[] = [];
  const noteLines: string[] = [];
  for (const line of (msg ?? "").split("\n")) {
    const mCompany = line.match(/^\[업체명\]\s*(.+)$/);
    const mInterest = line.match(/^\[관심\s*품목\]\s*(.+)$/);
    if (mCompany) {
      company = mCompany[1].trim();
      continue;
    }
    if (mInterest) {
      mInterest[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => interests.push(s));
      continue;
    }
    noteLines.push(line);
  }
  return { company, interests, note: noteLines.join("\n").trim() };
}

export function toCustomer(l: Lead): Customer {
  const { company, interests, note } = parseMessage(l.message);
  return {
    id: l.id,
    type: "lead",
    company,
    contactName: l.name,
    phone: l.phone,
    email: l.email,
    region: l.region,
    vertical: l.vertical,
    stage: l.stage,
    source: l.source,
    interests,
    note,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const leads = await getLeads();
  return leads.map(toCustomer);
}
