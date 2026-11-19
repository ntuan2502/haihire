import crypto from "node:crypto";
import { env } from "../config/env";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants.ts";
import { toInstant } from "../common/date.util.ts";
import {
  formatUserDisplayName,
  SourcingChannel,
  type NotificationKind,
  type Role,
} from "@haihire/shared";
import { SeedCvStorage } from "./seed-cv-pdf.util.ts";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

const defaultPasswordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
const FIXED_SEED_EPOCH_MS = Date.parse("2026-11-19T06:00:00.000Z");

/**
 * Generates a deterministic RFC 4122 v4 UUID from structural numeric indices
 * so every seed run produces identical IDs and relations across all 4 orgs.
 */
function detUuid(
  prefixHex4: string,
  orgIdx: number,
  itemIdx: number,
  subIdx = 0,
): string {
  const orgHex = orgIdx.toString(16).padStart(3, "0");
  const subHex = subIdx.toString(16).padStart(3, "0");
  const itemHex = itemIdx.toString(16).padStart(12, "0");
  return `00000000-${prefixHex4}-4${orgHex}-8${subHex}-${itemHex}`;
}

const UUID_NS = {
  MEMBER: "1001",
  EMAIL_SETTING: "1002",
  AUDIT_LOG: "1003",
  JOB: "2001",
  TRACKING_LINK: "3001",
  TRACKING_CLICK: "3002",
  CANDIDATE: "4001",
  STORED_FILE: "4002",
  CANDIDATE_NOTE: "4003",
  APPLICATION: "5001",
  APPLICATION_NOTE: "5002",
  INTERVIEW: "6001",
  NOTIFICATION: "7001",
  ACTIVITY_LOG: "8001",
} as const;

// Fixed UUIDs preserved for E2E & cross-test consistency in Demo 1
const GLOBAL_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const DEMO1_BACKEND_JOB_ID = "00000000-0000-4000-8000-000000000101";
const DEMO1_RECRUITER_JOB_ID = "00000000-0000-4000-8000-000000000108";
const DEMO1_TEST_CANDIDATE_ID = "00000000-0000-4000-8000-000000000201";
const DEMO1_KANBAN_CANDIDATE_ID = "00000000-0000-4000-8000-000000000202";
const DEMO1_TEST_STORED_FILE_ID = "00000000-0000-4000-8000-000000000211";
const DEMO1_KANBAN_STORED_FILE_ID = "00000000-0000-4000-8000-000000000212";
const DEMO1_KANBAN_APP_ID = "00000000-0000-4000-8000-000000000301";
const DEMO1_TEST_APP_ID = "00000000-0000-4000-8000-000000000302";

const VIETNAMESE_LAST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đoàn",
  "Trịnh",
  "Lưu",
  "Mai",
] as const;

const VIETNAMESE_MIDDLE_NAMES = [
  "Văn",
  "Thị",
  "Hồng",
  "Minh",
  "Đức",
  "Hoàng",
  "Thanh",
  "Quốc",
  "Gia",
  "Hải",
  "Đình",
  "Xuân",
  "Ngọc",
  "Tuấn",
  "Bảo",
  "Anh",
  "Phương",
  "Thu",
  "Khánh",
  "Hữu",
] as const;

const VIETNAMESE_FIRST_NAMES = [
  "An",
  "Bình",
  "Cường",
  "Dũng",
  "Em",
  "Phong",
  "Giang",
  "Hương",
  "Huy",
  "Khoa",
  "Linh",
  "Minh",
  "Nam",
  "Oanh",
  "Phúc",
  "Quân",
  "Sơn",
  "Trang",
  "Tùng",
  "Uyên",
  "Việt",
  "Xuân",
  "Yến",
  "Thắng",
  "Thảo",
  "Hà",
  "Kiên",
  "Tú",
  "Hậu",
  "Loan",
] as const;

const INTL_FIRST_NAMES = [
  "James",
  "Alexander",
  "Sarah",
  "Emily",
  "Michael",
  "David",
  "Jessica",
  "Daniel",
  "Sophia",
  "Lucas",
  "Oliver",
  "Emma",
  "Ethan",
  "Liam",
  "Ava",
  "Noah",
  "Chloe",
  "Mason",
  "Grace",
  "Logan",
  "Benjamin",
  "Charlotte",
  "Henry",
  "Amelia",
] as const;

const INTL_LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Miller",
  "Davis",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
] as const;

interface BaseJobConfig {
  title: string;
  department: string;
  description: string;
  requirements: string;
}

const BASE_JOB_CONFIGS: BaseJobConfig[] = [
  {
    title: "Senior Full-Stack Engineer (React / Node.js)",
    department: "Engineering",
    description: `Chúng tôi đang tìm kiếm Senior Full-Stack Engineer tài năng tham gia phát triển nền tảng SaaS thế hệ mới.
Bạn sẽ chịu trách nhiệm thiết kế kiến trúc hệ thống, xây dựng các tính năng cốt lõi và tối ưu hóa hiệu năng trải nghiệm người dùng từ Frontend Next.js đến Backend microservices.`,
    requirements: `- Tối thiểu 4 năm kinh nghiệm với React, TypeScript, Next.js và Node.js/NestJS.
- Thành thạo kiến trúc RESTful API, PostgreSQL, Redis và ORM (Prisma/TypeORM).
- Tư duy thiết kế hệ thống tốt, quen thuộc với Docker và CI/CD pipelines.`,
  },
  {
    title: "Senior Backend Engineer (NestJS / PostgreSQL)",
    department: "Engineering",
    description: `Tham gia đội ngũ kỹ thuật xây dựng hệ thống xử lý dữ liệu quy mô lớn với độ trễ thấp và bảo mật cao.
Bạn sẽ trực tiếp thiết kế cơ sở dữ liệu, quản lý kết nối MinIO lưu trữ tài liệu và triển khai Event-Driven Architecture.`,
    requirements: `- 4+ năm kinh nghiệm Backend với Node.js, NestJS và TypeScript.
- Chuyên sâu về tối ưu truy vấn PostgreSQL, indexing và caching.
- Có kinh nghiệm với SSE (Server-Sent Events), WebSockets và message queues.`,
  },
  {
    title: "Lead Frontend Architect (Next.js & Performance)",
    department: "Engineering",
    description: `Dẫn dắt kiến trúc giao diện người dùng, định hình Design System và nâng cao tiêu chuẩn trải nghiệm Web Interface Guidelines.
Đảm bảo hiệu suất Core Web Vitals tối đa trên cả thiết bị di động và máy tính để bàn.`,
    requirements: `- 5+ năm phát triển Frontend hiện đại với React 19, Next.js App Router, Tailwind CSS v4.
- Am hiểu sâu sắc về Performance Profiling, Bundle Size Optimization và Micro-frontends.
- Khả năng mentoring và dẫn dắt đội ngũ kỹ sư Frontend.`,
  },
  {
    title: "Senior Product Designer (UI/UX & Design System)",
    department: "Design",
    description: `Chịu trách nhiệm toàn diện về trải nghiệm người dùng, từ nghiên cứu người dùng (User Research), vẽ Wireframes đến hoàn thiện Prototype có độ trung thực cao trên Figma.`,
    requirements: `- 4+ năm kinh nghiệm thiết kế UI/UX cho các sản phẩm B2B SaaS hoặc Nền tảng Doanh nghiệp.
- Thành thạo Figma, Design Tokens và xây dựng Design System quy mô lớn.
- Tư duy sản phẩm sắc bén và khả năng tương tác chặt chẽ với Kỹ sư phần mềm.`,
  },
  {
    title: "Senior Product Manager (B2B SaaS)",
    department: "Product",
    description: `Định hướng tầm nhìn sản phẩm, xác định Product Roadmap và dẫn dắt quy trình phát triển sản phẩm theo phương pháp Agile/Scrum.`,
    requirements: `- 3+ năm làm Product Manager cho các sản phẩm công nghệ B2B / SaaS.
- Khả năng phân tích dữ liệu định lượng và định tính xuất sắc.
- Kỹ năng giao tiếp và thuyết phục các bên liên quan (Stakeholders).`,
  },
  {
    title: "DevOps & Cloud Infrastructure Engineer (AWS / K8s)",
    department: "DevOps",
    description: `Quản lý hạ tầng đám mây AWS, triển khai hệ thống containerization với Docker/Kubernetes và đảm bảo Uptime hệ thống đạt 99.99%.`,
    requirements: `- 3+ năm kinh nghiệm quản trị hạ tầng Linux, AWS / GCP.
- Thành thạo Terraform, Docker, Kubernetes và GitHub Actions / GitLab CI.
- Kinh nghiệm giám sát hệ thống với Prometheus, Grafana và Datadog.`,
  },
  {
    title: "QA Automation Engineer (Playwright / Vitest)",
    department: "Quality Assurance",
    description: `Xây dựng khung kiểm thử tự động (Automation Test Framework) cho cả API và End-to-End UI, tích hợp tự động vào quy trình CI/CD.`,
    requirements: `- 2+ năm kinh nghiệm viết E2E test với Playwright, Cypress hoặc Selenium.
- Thành thạo TypeScript, kiểm thử API với Vitest/Jest và Postman.
- Tư duy kiểm thử chặt chẽ, chú trọng trải nghiệm người dùng cuối.`,
  },
  {
    title: "Growth Marketing Lead",
    department: "Marketing",
    description: `Lên kế hoạch và thực thi chiến lược tăng trưởng người dùng B2B, tối ưu hóa phễu chuyển đổi (Conversion Funnel) và quản lý các kênh truyền thông số.`,
    requirements: `- 3+ năm kinh nghiệm Growth Marketing trong lĩnh vực Tech / SaaS.
- Nắm vững Google Analytics, SEO, SEM, LinkedIn Ads và Content Marketing.
- Tư duy hướng dữ liệu (Data-driven mindset).`,
  },
  {
    title: "Senior Technical Recruiter (HR)",
    department: "Human Resources",
    description: `Trực tiếp săn tìm và thu hút nhân tài công nghệ hàng đầu (Headhunting), quản lý quy trình phỏng vấn và nâng cao trải nghiệm ứng viên.`,
    requirements: `- 3+ năm kinh nghiệm tuyển dụng vị trí kỹ thuật IT (Software Engineers, PM, Designers).
- Mạng lưới ứng viên IT rộng rãi và khả năng kết nối tốt qua LinkedIn, GitHub.
- Kỹ năng đàm phán chế độ đãi ngộ và văn hóa tuyển dụng minh bạch.`,
  },
  {
    title: "Enterprise Account Executive (SaaS Sales)",
    department: "Sales",
    description: `Mở rộng thị trường doanh nghiệp tại khu vực Đông Nam Á, đàm phán hợp đồng lớn và xây dựng mối quan hệ đối tác chiến lược lâu dài.`,
    requirements: `- 4+ năm kinh nghiệm bán hàng phần mềm doanh nghiệp (B2B SaaS / Enterprise Software).
- Thành tích vượt KPI doanh số đã được chứng minh.
- Tiếng Anh lưu loát, ưu tiên ứng viên có kinh nghiệm thị trường Singapore/SEA.`,
  },
  {
    title: "AI & LLM Solutions Engineer",
    department: "Engineering",
    description: `Nghiên cứu và tích hợp các mô hình ngôn ngữ lớn (LLMs), công cụ Agentic AI và RAG Pipelines phục vụ tự động hóa quy trình tuyển dụng thông minh.`,
    requirements: `- 3+ năm kinh nghiệm lập trình Python / TypeScript.
- Am hiểu sâu sắc về Prompt Engineering, Vector Databases (Pinecone/pgvector), LangChain/LlamaIndex.
- Tư duy sản phẩm ứng dụng AI thực tế, chú trọng độ chính xác và bảo mật dữ liệu.`,
  },
  {
    title: "Mobile App Developer (React Native / iOS)",
    department: "Engineering",
    description: `Phát triển và tối ưu ứng dụng di động đa nền tảng cho nhà tuyển dụng và ứng viên với giao diện trực quan và khả năng hoạt động offline.`,
    requirements: `- 3+ năm kinh nghiệm với React Native, TypeScript và Redux/Zustand.
- Thành thạo native modules trên iOS (Swift) hoặc Android (Kotlin).
- Đã từng xuất bản và vận hành ứng dụng trên App Store và Google Play.`,
  },
  {
    title: "Data Platform Engineer (ClickHouse / ETL)",
    department: "Data Platform",
    description: `Xây dựng kiến trúc Data Warehouse và hệ thống phân tích báo cáo thời gian thực, phục vụ dữ liệu trực quan hóa tuyển dụng quy mô lớn.`,
    requirements: `- 3+ năm kinh nghiệm với SQL nâng cao, ClickHouse, Apache Kafka và dbt/Airflow.
- Thành thạo thiết kế lược đồ dữ liệu hình sao (Star schema) và tối ưu hóa truy vấn phân tích.
- Kinh nghiệm triển khai đường ống dữ liệu batch và streaming.`,
  },
  {
    title: "Information Security & SecOps Specialist",
    department: "Security",
    description: `Đảm bảo tuân thủ tiêu chuẩn an toàn thông tin (ISO 27001, SOC 2, OWASP), rà quét lỗ hổng và thiết lập hệ thống cảnh báo xâm nhập.`,
    requirements: `- 3+ năm kinh nghiệm trong lĩnh vực An toàn thông tin và bảo mật mạng.
- Chứng chỉ bảo mật (CISSP, CEH hoặc AWS Certified Security) là lợi thế.
- Khả năng thực hiện Penetration Testing và khắc phục lỗ hổng ứng dụng web.`,
  },
  {
    title: "Customer Success Lead (Enterprise Tier 1)",
    department: "Customer Success",
    description: `Đồng hành cùng các khách hàng doanh nghiệp lớn trong quá trình Onboarding, đào tạo hệ thống và đảm bảo tỷ lệ gia hạn hợp đồng (Retention Rate).`,
    requirements: `- 3+ năm làm Customer Success hoặc Account Management trong lĩnh vực B2B SaaS.
- Kỹ năng lắng nghe, giải quyết vấn đề và tư duy phục vụ khách hàng xuất sắc.
- Khả năng phối hợp liên phòng ban để phản hồi kịp thời nhu cầu tính năng mới.`,
  },
  {
    title: "Technical Content Writer & Documentation",
    department: "Marketing",
    description: `Biên soạn tài liệu hướng dẫn kỹ thuật, API Documentation, blog chia sẻ kiến thức công nghệ và bài học kinh nghiệm tuyển dụng (Case studies).`,
    requirements: `- 2+ năm viết nội dung công nghệ bằng tiếng Anh và tiếng Việt.
- Khả năng đọc hiểu tài liệu kỹ thuật, kiến trúc phần mềm và API.
- Phong cách viết rõ ràng, súc tích và chuẩn SEO.`,
  },
  {
    title: "Engineering Manager (Platform Team)",
    department: "Engineering",
    description: `Quản lý và phát triển đội ngũ kỹ sư 10-15 người, tối ưu hóa năng suất phát triển (Engineering Velocity) và duy trì văn hóa kỹ thuật lành mạnh.`,
    requirements: `- 2+ năm kinh nghiệm quản lý đội ngũ kỹ sư phần mềm (Engineering Management).
- Nền tảng kỹ thuật vững vàng với các hệ thống phân tán.
- Kỹ năng 1-on-1, định hướng lộ trình sự nghiệp và giải quyết xung đột.`,
  },
  {
    title: "UI/UX Interaction Designer",
    department: "Design",
    description: `Tập trung vào vi tương tác (Micro-interactions), chuyển động (Motion design) và khả năng tiếp cận (Accessibility - a11y) của sản phẩm.`,
    requirements: `- 3+ năm kinh nghiệm thiết kế tương tác và chuyển động giao diện web/app.
- Thành thạo Figma, Protopie, Framer hoặc After Effects.
- Nắm vững các nguyên tắc Web Accessibility (WCAG 2.1).`,
  },
  {
    title: "Talent Acquisition Specialist",
    department: "Human Resources",
    description: `Tìm kiếm, kết nối và quản lý phễu ứng viên cho các vị trí kinh doanh, vận hành và quản lý cấp trung trong công ty.`,
    requirements: `- 2+ năm kinh nghiệm tuyển dụng đa dạng các ngành nghề.
- Khả năng lọc hồ sơ nhanh chóng và phỏng vấn đánh giá kỹ năng mềm chính xác.
- Tác phong chuyên nghiệp, năng động và nhiệt huyết.`,
  },
  {
    title: "Solutions Architect (Cloud Native)",
    department: "Engineering",
    description: `Tư vấn và thiết kế giải pháp kỹ thuật tổng thể cho các khách hàng tích hợp hệ thống ATS vào hạ tầng ERP / HRIS hiện có của doanh nghiệp.`,
    requirements: `- 5+ năm kinh nghiệm kiến trúc hệ thống đám mây và tích hợp doanh nghiệp (Enterprise Integration).
- Am hiểu SSO (SAML / OAuth2 / OIDC), webhook bảo mật và API Gateway.
- Kỹ năng thuyết trình giải pháp và làm việc với các giám đốc công nghệ (CTO/CIO).`,
  },
];

type StageName =
  "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
type JobStatusName = "PUBLISHED" | "DRAFT" | "CLOSED";

interface SeedUserSpec {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  rolesByOrg: readonly [Role, Role, Role, Role];
}

// 15 real users across all 4 organizations (1 Global Admin + 4 Org Owners + 10 Team/Interviewers)
const ALL_SEED_USERS: readonly SeedUserSpec[] = [
  {
    id: GLOBAL_ADMIN_ID,
    email: DEMO_ACCOUNTS.ADMIN.email,
    firstName: DEMO_ACCOUNTS.ADMIN.firstName,
    lastName: DEMO_ACCOUNTS.ADMIN.lastName,
    title: "Platform Super Admin",
    rolesByOrg: ["ADMIN", "ADMIN", "ADMIN", "ADMIN"],
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    email: "admin1@tun.io.vn",
    firstName: "Admin 1",
    lastName: "Demo",
    title: "Demo 1 Owner",
    rolesByOrg: ["ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER"],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    email: "admin2@tun.io.vn",
    firstName: "Admin 2",
    lastName: "Demo",
    title: "Demo 2 Owner",
    rolesByOrg: ["HIRING_MANAGER", "ADMIN", "INTERVIEWER", "MEMBER"],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    email: "admin3@tun.io.vn",
    firstName: "Admin 3",
    lastName: "Demo",
    title: "Demo 3 Owner",
    rolesByOrg: ["INTERVIEWER", "MEMBER", "ADMIN", "RECRUITER"],
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    email: "admin4@tun.io.vn",
    firstName: "Admin 4",
    lastName: "Demo",
    title: "Demo 4 Owner",
    rolesByOrg: ["MEMBER", "HIRING_MANAGER", "RECRUITER", "ADMIN"],
  },
  {
    id: "00000000-0000-4000-8000-000000001001",
    email: "an.nguyen@tun.io.vn",
    firstName: "An",
    lastName: "Nguyễn Văn",
    title: "Engineering Lead",
    rolesByOrg: ["HIRING_MANAGER", "RECRUITER", "INTERVIEWER", "ADMIN"],
  },
  {
    id: "00000000-0000-4000-8000-000000001002",
    email: "bich.tran@tun.io.vn",
    firstName: "Bích",
    lastName: "Trần Thị",
    title: "HR Director",
    rolesByOrg: ["RECRUITER", "HIRING_MANAGER", "ADMIN", "INTERVIEWER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001003",
    email: "cuong.le@tun.io.vn",
    firstName: "Cường",
    lastName: "Lê Hoàng",
    title: "CTO",
    rolesByOrg: [
      "HIRING_MANAGER",
      "INTERVIEWER",
      "RECRUITER",
      "HIRING_MANAGER",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000001004",
    email: "dung.pham@tun.io.vn",
    firstName: "Dung",
    lastName: "Phạm Minh",
    title: "Talent Acquisition Lead",
    rolesByOrg: ["RECRUITER", "ADMIN", "HIRING_MANAGER", "RECRUITER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001005",
    email: "bao.hoang@tun.io.vn",
    firstName: "Bảo",
    lastName: "Hoàng Quốc",
    title: "Principal Architect",
    rolesByOrg: ["INTERVIEWER", "HIRING_MANAGER", "INTERVIEWER", "MEMBER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001006",
    email: "huong.vu@tun.io.vn",
    firstName: "Hương",
    lastName: "Vũ Thu",
    title: "VP of Product",
    rolesByOrg: ["HIRING_MANAGER", "RECRUITER", "MEMBER", "HIRING_MANAGER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001007",
    email: "kiet.dang@tun.io.vn",
    firstName: "Kiệt",
    lastName: "Đặng Tuấn",
    title: "Staff Backend Engineer",
    rolesByOrg: ["INTERVIEWER", "INTERVIEWER", "HIRING_MANAGER", "RECRUITER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001008",
    email: "lan.bui@tun.io.vn",
    firstName: "Lan",
    lastName: "Bùi Ngọc",
    title: "Head of People Operations",
    rolesByOrg: ["ADMIN", "MEMBER", "RECRUITER", "INTERVIEWER"],
  },
  {
    id: "00000000-0000-4000-8000-000000001009",
    email: "minh.do@tun.io.vn",
    firstName: "Minh",
    lastName: "Đỗ Đức",
    title: "Engineering Manager",
    rolesByOrg: [
      "INTERVIEWER",
      "HIRING_MANAGER",
      "INTERVIEWER",
      "HIRING_MANAGER",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000001010",
    email: "thao.ngo@tun.io.vn",
    firstName: "Thảo",
    lastName: "Ngô Phương",
    title: "HR Coordinator",
    rolesByOrg: ["MEMBER", "INTERVIEWER", "HIRING_MANAGER", "MEMBER"],
  },
];

interface OrgBlueprint {
  orgIndex: 1 | 2 | 3 | 4;
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  fromName: string;
  fromEmail: string;
  jobStatusCounts: Record<JobStatusName, number>;
  trackingLinkCount: number;
  totalTrackingClickRows: number;
  candidateJobCountDist: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, number>;
  stageCounts: Record<StageName, number>;
  totalInterviews: number;
  adminNotifications: { total: number; unread: number };
  otherMemberNotifications: number;
  candidateNameOffset: number;
}

const ORG_BLUEPRINTS: readonly OrgBlueprint[] = [
  {
    orgIndex: 1,
    id: "00000000-0000-4000-8000-000000000010",
    name: "Demo 1",
    slug: "demo-1",
    ownerId: "00000000-0000-4000-8000-000000000101",
    fromName: "Demo 1 Recruitment Team",
    fromEmail: "careers-demo1@tun.io.vn",
    jobStatusCounts: { PUBLISHED: 8, DRAFT: 6, CLOSED: 6 },
    trackingLinkCount: 24,
    totalTrackingClickRows: 780,
    candidateJobCountDist: { 0: 14, 1: 46, 2: 24, 3: 18, 4: 10, 5: 5, 6: 3 },
    stageCounts: {
      APPLIED: 45,
      SCREENING: 39,
      INTERVIEW: 42,
      OFFER: 34,
      HIRED: 35,
      REJECTED: 36,
    },
    totalInterviews: 248,
    adminNotifications: { total: 12, unread: 7 },
    otherMemberNotifications: 12,
    candidateNameOffset: 0,
  },
  {
    orgIndex: 2,
    id: "00000000-0000-4000-8000-000000000020",
    name: "Demo 2",
    slug: "demo-2",
    ownerId: "00000000-0000-4000-8000-000000000102",
    fromName: "Demo 2 Recruitment Team",
    fromEmail: "careers-demo2@tun.io.vn",
    jobStatusCounts: { PUBLISHED: 7, DRAFT: 5, CLOSED: 4 },
    trackingLinkCount: 20,
    totalTrackingClickRows: 610,
    candidateJobCountDist: { 0: 10, 1: 35, 2: 18, 3: 13, 4: 8, 5: 4, 6: 2 },
    stageCounts: {
      APPLIED: 34,
      SCREENING: 29,
      INTERVIEW: 31,
      OFFER: 26,
      HIRED: 27,
      REJECTED: 27,
    },
    totalInterviews: 186,
    adminNotifications: { total: 14, unread: 8 },
    otherMemberNotifications: 12,
    candidateNameOffset: 120,
  },
  {
    orgIndex: 3,
    id: "00000000-0000-4000-8000-000000000030",
    name: "Demo 3",
    slug: "demo-3",
    ownerId: "00000000-0000-4000-8000-000000000103",
    fromName: "Demo 3 Recruitment Team",
    fromEmail: "careers-demo3@tun.io.vn",
    jobStatusCounts: { PUBLISHED: 6, DRAFT: 4, CLOSED: 4 },
    trackingLinkCount: 18,
    totalTrackingClickRows: 520,
    candidateJobCountDist: { 0: 9, 1: 28, 2: 15, 3: 11, 4: 7, 5: 3, 6: 2 },
    stageCounts: {
      APPLIED: 28,
      SCREENING: 25,
      INTERVIEW: 26,
      OFFER: 22,
      HIRED: 22,
      REJECTED: 23,
    },
    totalInterviews: 155,
    adminNotifications: { total: 10, unread: 6 },
    otherMemberNotifications: 12,
    candidateNameOffset: 210,
  },
  {
    orgIndex: 4,
    id: "00000000-0000-4000-8000-000000000040",
    name: "Demo 4",
    slug: "demo-4",
    ownerId: "00000000-0000-4000-8000-000000000104",
    fromName: "Demo 4 Recruitment Team",
    fromEmail: "careers-demo4@tun.io.vn",
    jobStatusCounts: { PUBLISHED: 8, DRAFT: 5, CLOSED: 5 },
    trackingLinkCount: 22,
    totalTrackingClickRows: 690,
    candidateJobCountDist: { 0: 12, 1: 40, 2: 21, 3: 16, 4: 9, 5: 4, 6: 3 },
    stageCounts: {
      APPLIED: 40,
      SCREENING: 34,
      INTERVIEW: 36,
      OFFER: 30,
      HIRED: 31,
      REJECTED: 33,
    },
    totalInterviews: 218,
    adminNotifications: { total: 16, unread: 9 },
    otherMemberNotifications: 12,
    candidateNameOffset: 285,
  },
];

interface SeedCandidateTemplate {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date;
}

function getCandidateDemographics(name: string, index: number) {
  const femaleHints = [
    "Thị",
    "Hồng",
    "Thảo",
    "Hương",
    "Trang",
    "Uyên",
    "Yến",
    "Loan",
    "Oanh",
    "Linh",
    "Sarah",
    "Emily",
    "Jessica",
    "Sophia",
    "Emma",
    "Ava",
    "Chloe",
    "Grace",
    "Charlotte",
    "Amelia",
  ];
  const maleHints = [
    "Văn",
    "Đức",
    "Hoàng",
    "Quốc",
    "Hải",
    "Tuấn",
    "Dũng",
    "Cường",
    "Nam",
    "Thắng",
    "Kiên",
    "Tú",
    "James",
    "Alexander",
    "Michael",
    "David",
    "Daniel",
    "Lucas",
    "Oliver",
    "Ethan",
    "Liam",
    "Noah",
    "Mason",
    "Logan",
    "Benjamin",
    "Henry",
  ];

  let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
  if (femaleHints.some((h) => name.includes(h))) {
    gender = "FEMALE";
  } else if (maleHints.some((h) => name.includes(h))) {
    gender = "MALE";
  } else {
    gender = index % 2 === 0 ? "MALE" : "FEMALE";
  }

  const birthYear = 1988 + (index % 15);
  const birthMonth = (index % 12) + 1;
  const birthDay = ((index * 3) % 27) + 1;
  const dateOfBirth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

  return { gender, dateOfBirth };
}

function buildMasterCandidatePool(
  totalNeeded: number,
): SeedCandidateTemplate[] {
  const vnPool: Array<{
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }> = [];
  const intlPool: Array<{
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }> = [];
  const usedNames = new Set<string>();

  const targetVn = Math.ceil(totalNeeded * 0.7);
  const targetIntl = totalNeeded - targetVn;

  let vnIdx = 0;
  for (const ln of VIETNAMESE_LAST_NAMES) {
    for (const mn of VIETNAMESE_MIDDLE_NAMES) {
      for (const fn of VIETNAMESE_FIRST_NAMES) {
        if (vnIdx >= targetVn) break;
        const name = `${ln} ${mn} ${fn}`;
        if (usedNames.has(name)) continue;
        usedNames.add(name);
        vnIdx++;
        const normalized = name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ".");
        vnPool.push({
          name,
          firstName: fn,
          lastName: `${ln} ${mn}`,
          email: `${normalized}.${vnIdx + 10}@example.com`,
          phone: `09${String(10000000 + vnIdx * 137).slice(-8)}`,
        });
      }
      if (vnIdx >= targetVn) break;
    }
    if (vnIdx >= targetVn) break;
  }

  let intlIdx = 0;
  for (const fn of INTL_FIRST_NAMES) {
    for (const ln of INTL_LAST_NAMES) {
      if (intlIdx >= targetIntl) break;
      const name = `${fn} ${ln}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      intlIdx++;
      const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
      intlPool.push({
        name,
        firstName: fn,
        lastName: ln,
        email: `${normalized}.${intlIdx + 500}@example.com`,
        phone: `09${String(50000000 + intlIdx * 179).slice(-8)}`,
      });
    }
    if (intlIdx >= targetIntl) break;
  }

  // Deterministically interleave VN (~70%) and Intl (~30%)
  const merged: SeedCandidateTemplate[] = [];
  let viPtr = 0;
  let enPtr = 0;
  for (let i = 0; i < totalNeeded; i++) {
    const pickIntl = i % 10 === 2 || i % 10 === 6 || i % 10 === 9;
    const raw =
      (pickIntl && enPtr < intlPool.length) || viPtr >= vnPool.length
        ? intlPool[enPtr++]
        : vnPool[viPtr++];
    const { gender, dateOfBirth } = getCandidateDemographics(raw.name, i);
    merged.push({ ...raw, gender, dateOfBirth });
  }
  return merged;
}

class InterviewSlotManager {
  private static readonly DAILY_TIMES = [
    "08:00",
    "08:45",
    "09:30",
    "10:15",
    "11:00",
    "11:30",
    "13:30",
    "14:15",
    "15:00",
    "15:45",
    "16:30",
  ] as const;

  private usedSlots = new Set<string>();
  private upcomingSlots: Array<{ date: string; time: string }> = [];
  private pastTier1Slots: Array<{ date: string; time: string }> = [];
  private pastTier2Slots: Array<{ date: string; time: string }> = [];
  private pastTier3Slots: Array<{ date: string; time: string }> = [];
  private fallbackCounter = 180;

  constructor() {
    this.initQueues();
  }

  private initQueues() {
    const now = new Date();

    // Upcoming slots: Day +1 onward (1200+ weekday slots)
    let upDay = 1;
    while (this.upcomingSlots.length < 1200) {
      const d = new Date(now);
      d.setDate(now.getDate() + upDay);
      upDay++;
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of InterviewSlotManager.DAILY_TIMES) {
        this.upcomingSlots.push({ date: dateStr, time });
      }
    }

    // Past Tier 3 (recent past)
    let pDay = 1;
    while (this.pastTier3Slots.length < 600) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of InterviewSlotManager.DAILY_TIMES) {
        this.pastTier3Slots.push({ date: dateStr, time });
      }
    }

    // Past Tier 2 (mid past)
    while (this.pastTier2Slots.length < 600) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of InterviewSlotManager.DAILY_TIMES) {
        this.pastTier2Slots.push({ date: dateStr, time });
      }
    }

    // Past Tier 1 (older past)
    while (this.pastTier1Slots.length < 900) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of InterviewSlotManager.DAILY_TIMES) {
        this.pastTier1Slots.push({ date: dateStr, time });
      }
    }
  }

  public allocateSlot(
    round: number,
    totalRounds: number,
    isCompleted: boolean,
  ): { date: string; time: string } {
    let slot: { date: string; time: string } | undefined;

    if (!isCompleted) {
      slot = this.upcomingSlots.shift();
    } else if (round === totalRounds || round >= 3) {
      slot = this.pastTier3Slots.shift();
    } else if (round === 2 || (round === totalRounds - 1 && totalRounds >= 2)) {
      slot = this.pastTier2Slots.shift();
    } else {
      slot = this.pastTier1Slots.shift();
    }

    if (!slot) {
      return this.generateFallbackSlot(isCompleted);
    }

    const key = `${slot.date} ${slot.time}`;
    if (this.usedSlots.has(key)) {
      return this.generateFallbackSlot(isCompleted);
    }
    this.usedSlots.add(key);
    return slot;
  }

  private generateFallbackSlot(isCompleted: boolean): {
    date: string;
    time: string;
  } {
    while (true) {
      this.fallbackCounter++;
      const now = new Date();
      const d = new Date(now);
      d.setDate(
        now.getDate() +
          (isCompleted ? -this.fallbackCounter : this.fallbackCounter),
      );
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of InterviewSlotManager.DAILY_TIMES) {
        const key = `${dateStr} ${time}`;
        if (!this.usedSlots.has(key)) {
          this.usedSlots.add(key);
          return { date: dateStr, time };
        }
      }
    }
  }

  public generateInterviewObject(
    round: number,
    totalRounds: number,
    isCompleted: boolean,
    seedIndex: number,
    interviewers: ReadonlyArray<{ id: string; displayName: string }>,
  ) {
    const slot = this.allocateSlot(round, totalRounds, isCompleted);

    const roundTypes = [
      "HR_SCREENING",
      "TECHNICAL",
      "CULTURE_FIT",
      "FINAL_ROUND",
    ] as const;
    const type = roundTypes[Math.min(round - 1, roundTypes.length - 1)];

    const formats = ["MEET", "ZOOM", "TEAMS", "OFFICE"] as const;
    const format = formats[(seedIndex + round) % formats.length];

    const assigned =
      interviewers[(seedIndex * 2 + round) % interviewers.length];

    const linkOrLocation =
      format === "OFFICE"
        ? "Tầng 5, Tòa nhà Keangnam Landmark 72, Hà Nội"
        : `https://meet.google.com/haihire-demo-${seedIndex}-${round}`;

    const scheduledAt = toInstant(
      new Date(`${slot.date}T${slot.time}:00+07:00`),
    );

    return {
      scheduledAt,
      type,
      format,
      linkOrLocation,
      interviewerId: assigned.id,
      interviewer: assigned.displayName,
      notes: isCompleted
        ? `Vòng ${round} đã hoàn thành. Đánh giá ứng viên đáp ứng tốt tiêu chuẩn.`
        : `Lịch hẹn phỏng vấn Vòng ${round}. Vui lòng kiểm tra tài liệu trước cuộc họp.`,
      round,
    };
  }
}

interface SeedTrackingLinkTemplate {
  name: string;
  source: SourcingChannel;
  customSource?: string | null;
  jobIndex: number | null;
  campaign?: string | null;
  medium?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  clicksCount: number;
  isActive: boolean;
  ageDays: number;
  token: string;
}

const SEED_TRACKING_LINKS: readonly SeedTrackingLinkTemplate[] = [
  {
    name: "LinkedIn - Tech Hiring Campaign Q3",
    source: SourcingChannel.LINKEDIN,
    jobIndex: 0,
    campaign: "tech-q3-2026",
    medium: "social",
    utmSource: "linkedin",
    utmMedium: "social",
    utmCampaign: "tech-q3-2026",
    utmTerm: "fullstack-lead",
    utmContent: "sponsored-feed-ad",
    clicksCount: 840,
    isActive: true,
    ageDays: 45,
    token: "lnk-li-q3-fullstack",
  },
  {
    name: "LinkedIn - Recruiter Direct InMail",
    source: SourcingChannel.LINKEDIN,
    jobIndex: 1,
    campaign: "inmail-backend-direct",
    medium: "inmail",
    utmSource: "linkedin",
    utmMedium: "inmail",
    utmCampaign: "inmail-backend-direct",
    utmTerm: "senior-backend",
    utmContent: "talent-solutions-msg",
    clicksCount: 260,
    isActive: true,
    ageDays: 30,
    token: "lnk-li-inmail-backend",
  },
  {
    name: "Indeed - Sponsored Backend Developer",
    source: SourcingChannel.INDEED,
    jobIndex: 1,
    campaign: "indeed-sponsored-vn",
    medium: "job-board",
    utmSource: "indeed",
    utmMedium: "job-board",
    utmCampaign: "indeed-sponsored-vn",
    utmTerm: "backend-nodejs",
    utmContent: "premium-placement",
    clicksCount: 520,
    isActive: true,
    ageDays: 40,
    token: "lnk-indeed-backend",
  },
  {
    name: "Google for Jobs - Organic Indexing",
    source: SourcingChannel.GOOGLE_JOBS,
    jobIndex: null,
    campaign: "google-jobs-schema",
    medium: "job-board",
    utmSource: "google-jobs",
    utmMedium: "job-board",
    utmCampaign: "google-jobs-schema",
    utmTerm: "job-search",
    utmContent: "rich-snippet",
    clicksCount: 920,
    isActive: true,
    ageDays: 55,
    token: "lnk-google-organic",
  },
  {
    name: "Facebook - Cộng Đồng Lập Trình Viên JS/TS",
    source: SourcingChannel.FACEBOOK,
    jobIndex: 0,
    campaign: "fb-community-post",
    medium: "social",
    utmSource: "facebook",
    utmMedium: "social",
    utmCampaign: "fb-community-post",
    utmTerm: "reactjs-vietnam",
    utmContent: "pinned-post",
    clicksCount: 460,
    isActive: true,
    ageDays: 35,
    token: "lnk-fb-js-community",
  },
  {
    name: "X / Twitter - Founder Hiring Thread",
    source: SourcingChannel.TWITTER_X,
    jobIndex: 0,
    campaign: "twitter-founder-q3",
    medium: "social",
    utmSource: "twitter",
    utmMedium: "social",
    utmCampaign: "twitter-founder-q3",
    utmTerm: "tech-lead",
    utmContent: "retweet-thread",
    clicksCount: 380,
    isActive: true,
    ageDays: 28,
    token: "lnk-x-founder-thread",
  },
  {
    name: "Reddit - r/forhire & r/vietnamesetech",
    source: SourcingChannel.REDDIT,
    jobIndex: 3,
    campaign: "reddit-monthly-hiring",
    medium: "social",
    utmSource: "reddit",
    utmMedium: "social",
    utmCampaign: "reddit-monthly-hiring",
    utmTerm: "qa-automation",
    utmContent: "monthly-thread-comment",
    clicksCount: 195,
    isActive: true,
    ageDays: 20,
    token: "lnk-reddit-qa-job",
  },
  {
    name: "WeWorkRemotely - Remote Global Search",
    source: SourcingChannel.WE_WORK_REMOTELY,
    jobIndex: 0,
    campaign: "wwr-featured-listing",
    medium: "job-board",
    utmSource: "weworkremotely",
    utmMedium: "job-board",
    utmCampaign: "wwr-featured-listing",
    utmTerm: "remote-fullstack",
    utmContent: "highlighted-listing",
    clicksCount: 620,
    isActive: true,
    ageDays: 42,
    token: "lnk-wwr-remote-dev",
  },
  {
    name: "Stack Overflow - Developer Talent Direct",
    source: SourcingChannel.STACK_OVERFLOW,
    jobIndex: 4,
    campaign: "stackoverflow-talent",
    medium: "job-board",
    utmSource: "stackoverflow",
    utmMedium: "job-board",
    utmCampaign: "stackoverflow-talent",
    utmTerm: "growth-marketing",
    utmContent: "sidebar-banner",
    clicksCount: 290,
    isActive: true,
    ageDays: 32,
    token: "lnk-so-talent-direct",
  },
  {
    name: "Glassdoor - Verified Employer Profile",
    source: SourcingChannel.GLASSDOOR,
    jobIndex: null,
    campaign: "glassdoor-brand-hub",
    medium: "job-board",
    utmSource: "glassdoor",
    utmMedium: "job-board",
    utmCampaign: "glassdoor-brand-hub",
    utmTerm: "company-review",
    utmContent: "profile-cta",
    clicksCount: 410,
    isActive: true,
    ageDays: 50,
    token: "lnk-glassdoor-hub",
  },
  {
    name: "Handshake - Campus & New Grad Outreach",
    source: SourcingChannel.HANDSHAKE,
    jobIndex: 5,
    campaign: "handshake-fall-grad",
    medium: "university",
    utmSource: "handshake",
    utmMedium: "university",
    utmCampaign: "handshake-fall-grad",
    utmTerm: "junior-recruiter",
    utmContent: "campus-fair-link",
    clicksCount: 165,
    isActive: true,
    ageDays: 18,
    token: "lnk-handshake-grad",
  },
  {
    name: "Email - Monthly Tech Talent Newsletter",
    source: SourcingChannel.EMAIL,
    jobIndex: null,
    campaign: "talent-newsletter-aug2026",
    medium: "email",
    utmSource: "email",
    utmMedium: "email",
    utmCampaign: "talent-newsletter-aug2026",
    utmTerm: "tech-digest",
    utmContent: "open-positions-section",
    clicksCount: 340,
    isActive: true,
    ageDays: 35,
    token: "lnk-email-newsletter",
  },
  {
    name: "Referral - Chương Trình Giới Thiệu Nội Bộ",
    source: SourcingChannel.REFERRAL,
    jobIndex: null,
    campaign: "internal-referral-2026",
    medium: "referral",
    utmSource: "referral",
    utmMedium: "referral",
    utmCampaign: "internal-referral-2026",
    utmTerm: "haihire-staff",
    utmContent: "slack-announcement",
    clicksCount: 280,
    isActive: true,
    ageDays: 60,
    token: "lnk-internal-referral",
  },
  {
    name: "Agency - Adecco Vietnam Săn Đầu Người",
    source: SourcingChannel.AGENCY,
    jobIndex: 6,
    campaign: "adecco-enterprise-sales",
    medium: "agency",
    utmSource: "adecco",
    utmMedium: "agency",
    utmCampaign: "adecco-enterprise-sales",
    utmTerm: "saas-account-executive",
    utmContent: "executive-search",
    clicksCount: 110,
    isActive: true,
    ageDays: 22,
    token: "lnk-agency-adecco",
  },
  {
    name: "Career Site - Trang Tuyển Dụng Chính Thức",
    source: SourcingChannel.CAREER_SITE,
    jobIndex: null,
    campaign: "careers-direct-brand",
    medium: "career-portal",
    utmSource: "careers-site",
    utmMedium: "career-portal",
    utmCampaign: "careers-direct-brand",
    utmTerm: "haihire-jobs",
    utmContent: "navbar-apply-now",
    clicksCount: 1450,
    isActive: true,
    ageDays: 70,
    token: "lnk-career-site-main",
  },
  {
    name: "Startup Fair - TechInAsia Vietnam Conference",
    source: SourcingChannel.OTHER,
    customSource: "TechInAsia Vietnam",
    jobIndex: 8,
    campaign: "tia-vietnam-2026",
    medium: "event-partner",
    utmSource: "techinasia",
    utmMedium: "event-partner",
    utmCampaign: "tia-vietnam-2026",
    utmTerm: "mobile-developer",
    utmContent: "event-directory",
    clicksCount: 180,
    isActive: true,
    ageDays: 16,
    token: "lnk-techinasia-fair",
  },
  {
    name: "LinkedIn - Senior Cloud Architect (Đã Tạm Dừng)",
    source: SourcingChannel.LINKEDIN,
    jobIndex: 9,
    campaign: "li-arch-paused",
    medium: "social",
    utmSource: "linkedin",
    utmMedium: "social",
    utmCampaign: "li-arch-paused",
    utmTerm: "cloud-architect",
    utmContent: "sponsored-feed",
    clicksCount: 95,
    isActive: false,
    ageDays: 60,
    token: "lnk-li-arch-paused",
  },
  {
    name: "X / Twitter - Chiến Dịch Mới Mở (Chưa Có Lượt Nhấp)",
    source: SourcingChannel.TWITTER_X,
    jobIndex: 1,
    campaign: "twitter-fresh-launch",
    medium: "social",
    utmSource: "twitter",
    utmMedium: "social",
    utmCampaign: "twitter-fresh-launch",
    utmTerm: "backend-hire",
    utmContent: "fresh-post",
    clicksCount: 0,
    isActive: true,
    ageDays: 1,
    token: "lnk-x-fresh-zero",
  },
  // Extra campaigns for orgs with 20..24 links
  {
    name: "LinkedIn - Official Company Page Life",
    source: SourcingChannel.LINKEDIN,
    jobIndex: null,
    campaign: "company-page-hiring",
    medium: "social",
    utmSource: "linkedin",
    utmMedium: "social",
    utmCampaign: "company-page-hiring",
    utmTerm: "tech-careers",
    utmContent: "header-button",
    clicksCount: 650,
    isActive: true,
    ageDays: 60,
    token: "lnk-li-org-page",
  },
  {
    name: "Indeed - Free Organic Feed Sync",
    source: SourcingChannel.INDEED,
    jobIndex: null,
    campaign: "indeed-organic-feed",
    medium: "job-board",
    utmSource: "indeed",
    utmMedium: "job-board",
    utmCampaign: "indeed-organic-feed",
    utmTerm: null,
    utmContent: null,
    clicksCount: 310,
    isActive: true,
    ageDays: 50,
    token: "lnk-indeed-feed",
  },
  {
    name: "Facebook - Ads Retargeting Tech Talent",
    source: SourcingChannel.FACEBOOK,
    jobIndex: 2,
    campaign: "fb-retargeting-devops",
    medium: "paid-social",
    utmSource: "facebook",
    utmMedium: "paid-social",
    utmCampaign: "fb-retargeting-devops",
    utmTerm: "cloud-devops",
    utmContent: "carousel-ad",
    clicksCount: 230,
    isActive: true,
    ageDays: 25,
    token: "lnk-fb-devops-ads",
  },
  {
    name: "Job Fair - Ngày Hội Việc Làm ĐH Bách Khoa HCM",
    source: SourcingChannel.OTHER,
    customSource: "ĐH Bách Khoa TP.HCM - Job Fair",
    jobIndex: 7,
    campaign: "jobfair-bachkhoa-2026",
    medium: "offline-event",
    utmSource: "jobfair-bachkhoa",
    utmMedium: "offline-event",
    utmCampaign: "jobfair-bachkhoa-2026",
    utmTerm: "ai-llm-engineer",
    utmContent: "booth-qr-code",
    clicksCount: 220,
    isActive: true,
    ageDays: 14,
    token: "lnk-bk-jobfair-2026",
  },
  {
    name: "Tech Expo - Triển Lãm Công Nghệ TopDev 2026",
    source: SourcingChannel.OTHER,
    customSource: "TopDev Vietnam Tech Expo",
    jobIndex: null,
    campaign: "topdev-expo-autumn",
    medium: "sponsorship",
    utmSource: "topdev-expo",
    utmMedium: "sponsorship",
    utmCampaign: "topdev-expo-autumn",
    utmTerm: "all-tech-roles",
    utmContent: "flyer-badge-qr",
    clicksCount: 430,
    isActive: true,
    ageDays: 26,
    token: "lnk-topdev-expo",
  },
  {
    name: "Indeed - Closed Position Promotion",
    source: SourcingChannel.INDEED,
    jobIndex: 2,
    campaign: "indeed-devops-old",
    medium: "job-board",
    utmSource: "indeed",
    utmMedium: "job-board",
    utmCampaign: "indeed-devops-old",
    utmTerm: "devops-k8s",
    utmContent: "standard-listing",
    clicksCount: 120,
    isActive: false,
    ageDays: 65,
    token: "lnk-indeed-devops-closed",
  },
];

function getDomainForChannel(channel: SourcingChannel): string {
  switch (channel) {
    case SourcingChannel.LINKEDIN:
      return "linkedin.com";
    case SourcingChannel.INDEED:
      return "indeed.com";
    case SourcingChannel.GOOGLE_JOBS:
      return "google.com";
    case SourcingChannel.FACEBOOK:
      return "facebook.com";
    case SourcingChannel.TWITTER_X:
      return "t.co";
    case SourcingChannel.REDDIT:
      return "reddit.com";
    case SourcingChannel.WE_WORK_REMOTELY:
      return "weworkremotely.com";
    case SourcingChannel.STACK_OVERFLOW:
      return "stackoverflow.com";
    case SourcingChannel.GLASSDOOR:
      return "glassdoor.com";
    case SourcingChannel.HANDSHAKE:
      return "joinhandshake.com";
    case SourcingChannel.EMAIL:
      return "mail.google.com";
    case SourcingChannel.REFERRAL:
      return "internal.haihire.vn";
    case SourcingChannel.AGENCY:
      return "adecco.com.vn";
    case SourcingChannel.CAREER_SITE:
      return "careers.haihire.vn";
    case SourcingChannel.OTHER:
    default:
      return "topdev.vn";
  }
}

/**
 * Deterministically assigns fixed statuses to N jobs matching exact statusCounts,
 * preserving critical E2E statuses at indices 1, 8, 13, 14.
 */
function buildDeterministicJobStatuses(
  counts: Record<JobStatusName, number>,
): JobStatusName[] {
  const total = counts.PUBLISHED + counts.DRAFT + counts.CLOSED;
  const result = new Array<JobStatusName>(total);
  const remaining = { ...counts };

  const pinStatus = (idx: number, status: JobStatusName) => {
    if (idx < total && remaining[status] > 0) {
      result[idx] = status;
      remaining[status]--;
    }
  };

  pinStatus(1, "PUBLISHED");
  pinStatus(8, "PUBLISHED");
  pinStatus(13, "CLOSED");
  pinStatus(14, "DRAFT");

  const rotation: JobStatusName[] = ["PUBLISHED", "DRAFT", "CLOSED"];
  let rotIdx = 0;
  for (let i = 0; i < total; i++) {
    if (result[i]) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidateStatus = rotation[(rotIdx + attempt) % 3];
      if (remaining[candidateStatus] > 0) {
        result[i] = candidateStatus;
        remaining[candidateStatus]--;
        rotIdx = (rotIdx + attempt + 1) % 3;
        break;
      }
    }
  }
  return result;
}

/**
 * Deterministically expands count distributions into an evenly interleaved array
 * of exact length = sum(counts) without Math.random().
 */
function buildInterleavedList<T extends string | number>(
  entries: ReadonlyArray<readonly [T, number]>,
  stride = 7,
): T[] {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const result = new Array<T>(total);
  const occupied = new Array<boolean>(total).fill(false);

  let cursor = 0;
  for (const [value, count] of entries) {
    for (let k = 0; k < count; k++) {
      cursor = (cursor + stride) % total;
      while (occupied[cursor]) {
        cursor = (cursor + 1) % total;
      }
      occupied[cursor] = true;
      result[cursor] = value;
    }
  }
  return result;
}

/**
 * Splits an exact integer total across weighted buckets deterministically.
 */
function allocateExactIntegers(
  total: number,
  weights: readonly number[],
): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) return weights.map(() => 0);

  const exacts = weights.map((w) => (w * total) / weightSum);
  const alloc = exacts.map((v) => Math.floor(v));
  let remainder = total - alloc.reduce((a, b) => a + b, 0);

  const rankedIndices = exacts
    .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);

  let ptr = 0;
  while (remainder > 0 && rankedIndices.length > 0) {
    const target = rankedIndices[ptr % rankedIndices.length];
    if (weights[target.idx] > 0) {
      alloc[target.idx]++;
      remainder--;
    }
    ptr++;
  }
  return alloc;
}

/**
 * Deterministically computes the exact number of interviews for every application
 * so the org hits `targetTotalInterviews` while covering 0..3 rounds per stage.
 */
function buildExactInterviewCounts(
  stages: readonly StageName[],
  targetTotalInterviews: number,
  pinnedAppIndices: Set<number>,
): number[] {
  const counts = stages.map((stage, idx) => {
    if (
      stage === "APPLIED" ||
      stage === "SCREENING" ||
      pinnedAppIndices.has(idx)
    ) {
      return 0;
    }
    if (stage === "INTERVIEW") {
      // Mix of 0 (awaiting scheduling) and 1..3 rounds
      const mod = idx % 10;
      if (mod === 0 || mod === 5) return 0;
      if (mod <= 6) return 1;
      if (mod <= 8) return 2;
      return 3;
    }
    if (stage === "OFFER" || stage === "HIRED") {
      return (idx % 3) + 1;
    }
    // REJECTED: mix of 0 (CV screen) and 1..3 rounds
    const rMod = idx % 4;
    return rMod;
  });

  let diff = targetTotalInterviews - counts.reduce((a, b) => a + b, 0);
  const eligibleIndices = stages
    .map((stage, idx) => ({ stage, idx }))
    .filter(
      ({ stage, idx }) =>
        stage !== "APPLIED" &&
        stage !== "SCREENING" &&
        !pinnedAppIndices.has(idx),
    );

  // Reserve a couple of 0-round INTERVIEW & REJECTED cases for coverage
  const reservedZeroInterview = new Set<number>();
  let reservedIv = 0;
  let reservedRej = 0;
  for (const { stage, idx } of eligibleIndices) {
    if (stage === "INTERVIEW" && counts[idx] === 0 && reservedIv < 3) {
      reservedZeroInterview.add(idx);
      reservedIv++;
    } else if (stage === "REJECTED" && counts[idx] === 0 && reservedRej < 4) {
      reservedZeroInterview.add(idx);
      reservedRej++;
    }
  }

  let pass = 0;
  while (diff !== 0 && pass < 2000) {
    pass++;
    for (const { stage, idx } of eligibleIndices) {
      if (diff === 0) break;
      if (reservedZeroInterview.has(idx)) continue;
      const min = stage === "OFFER" || stage === "HIRED" ? 1 : 0;
      const max = 3;
      if (diff > 0 && counts[idx] < max) {
        counts[idx]++;
        diff--;
      } else if (diff < 0 && counts[idx] > min) {
        counts[idx]--;
        diff++;
      }
    }
  }

  if (diff !== 0) {
    throw new Error(
      `Could not allocate exact interview total ${targetTotalInterviews} (remaining ${diff})`,
    );
  }
  return counts;
}

let pendingSeed: Promise<void> | undefined;

export async function runSeed(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  ) {
    throw new Error(
      "CRITICAL SAFETY ABORT: Refusing to wipe database in PRODUCTION (NODE_ENV=production). " +
        "To override, explicitly set ALLOW_PRODUCTION_SEED=true.",
    );
  }

  try {
    await prisma.$connect();
  } catch {
    // already connected
  }

  console.log("==================================================");
  console.log("🧹 1. Cleaning old database records & snapshot schema...");
  console.log("==================================================");

  await prisma.$executeRawUnsafe(
    `DROP SCHEMA IF EXISTS "_haihire_test_snapshot" CASCADE;`,
  );
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.emailFlowConfig.deleteMany();
  await prisma.emailSetting.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.applicationNote.deleteMany();
  await prisma.candidateNote.deleteMany();
  await prisma.candidateDocument.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.trackingClick.deleteMany();
  await prisma.trackingLink.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.storedFile.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.organizationRolePermission.deleteMany();
  await prisma.organizationWebhookSetting.deleteMany();
  await prisma.organizationAuditLog.deleteMany();
  await prisma.platformAuditLog.deleteMany();
  await prisma.inviteLink.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.job.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const cvStorage = new SeedCvStorage();
  await cvStorage.init();

  console.log("==================================================");
  console.log(
    "🏢 2. Seeding 4 Organizations & 15 Users across 60 Memberships...",
  );
  console.log("==================================================");

  // 2.1 Seed all 15 users
  for (const u of ALL_SEED_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        password: defaultPasswordHash,
        createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 30 * 86400000)),
        updatedAt: toInstant(new Date(FIXED_SEED_EPOCH_MS)),
      },
      update: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        password: defaultPasswordHash,
      },
    });
  }

  // 2.2 Seed the 4 organizations (demo-1..demo-4)
  for (const bp of ORG_BLUEPRINTS) {
    await prisma.organization.upsert({
      where: { id: bp.id },
      create: {
        id: bp.id,
        name: bp.name,
        slug: bp.slug,
        ownerId: bp.ownerId,
        createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 25 * 86400000)),
        updatedAt: toInstant(new Date(FIXED_SEED_EPOCH_MS)),
      },
      update: {
        name: bp.name,
        slug: bp.slug,
        ownerId: bp.ownerId,
      },
    });
  }

  // 2.3 Seed 60 deterministic memberships (15 users × 4 orgs) & NotificationPreferences
  const membershipsData: Prisma.OrganizationMemberCreateManyInput[] = [];
  const notifPrefsData: Prisma.NotificationPreferenceCreateManyInput[] = [];

  for (const bp of ORG_BLUEPRINTS) {
    ALL_SEED_USERS.forEach((u, userIdx) => {
      const role = u.rolesByOrg[bp.orgIndex - 1];
      membershipsData.push({
        id: detUuid(UUID_NS.MEMBER, bp.orgIndex, userIdx + 1),
        organizationId: bp.id,
        userId: u.id,
        role,
        createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 20 * 86400000)),
        updatedAt: toInstant(new Date(FIXED_SEED_EPOCH_MS)),
      });
      notifPrefsData.push({
        organizationId: bp.id,
        userId: u.id,
        applicationWebsite: true,
        interviewWebsite: true,
        applicationEmail: false,
        interviewEmail: false,
      });
    });
  }

  await prisma.organizationMember.createMany({ data: membershipsData });
  await prisma.notificationPreference.createMany({ data: notifPrefsData });

  const totalCandidatesNeeded = ORG_BLUEPRINTS.reduce(
    (sum, bp) =>
      sum + Object.values(bp.candidateJobCountDist).reduce((a, b) => a + b, 0),
    0,
  );
  const masterCandidatePool = buildMasterCandidatePool(totalCandidatesNeeded);
  const sharedSlotManager = new InterviewSlotManager();

  const LOCATIONS = [
    "Hanoi, Vietnam",
    "Ho Chi Minh City, Vietnam",
    "Da Nang, Vietnam",
    "Singapore / Remote",
    "Tokyo, Japan / Remote",
    "Global Remote",
  ] as const;
  const WORKPLACES = ["HYBRID", "REMOTE", "ON_SITE"] as const;
  const JOB_TYPES = [
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "INTERNSHIP",
  ] as const;
  const EXP_LEVELS = [
    "ENTRY_LEVEL",
    "MID_LEVEL",
    "SENIOR_LEVEL",
    "LEAD",
    "EXECUTIVE",
  ] as const;
  const SALARY_RANGES = [
    "$1,200 - $1,800 / month",
    "$1,800 - $2,800 / month",
    "$2,500 - $4,000 / month",
    "$3,200 - $5,000 / month",
    "$4,000 - $6,500 / month",
    "35,000,000 - 55,000,000 VND / month",
    "Negotiable",
  ] as const;

  const summaryRows: Array<{
    slug: string;
    jobs: string;
    links: number;
    clicks: number;
    candidates: number;
    applications: number;
    interviews: number;
    notifications: number;
  }> = [];

  for (const bp of ORG_BLUEPRINTS) {
    console.log("\n==================================================");
    console.log(
      `🏢 Seeding Organization: ${bp.name} (slug: ${bp.slug}, owner: ${bp.ownerId})`,
    );
    console.log("==================================================");

    // Build per-org interviewer, creator, and note author pools strictly from RBAC roles in this org
    const orgUsers = ALL_SEED_USERS.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: formatUserDisplayName(u, "LAST_FIRST"),
      role: u.rolesByOrg[bp.orgIndex - 1],
    }));
    const interviewerPool = orgUsers.filter((u) => u.role !== "MEMBER");
    const jobCreatorPool = orgUsers.filter(
      (u) => u.role === "ADMIN" || u.role === "RECRUITER",
    );
    const noteAuthorPool = orgUsers.filter(
      (u) =>
        u.role === "ADMIN" ||
        u.role === "RECRUITER" ||
        u.role === "HIRING_MANAGER",
    );

    // Email settings
    await prisma.emailSetting.create({
      data: {
        id: detUuid(UUID_NS.EMAIL_SETTING, bp.orgIndex, 1),
        organizationId: bp.id,
        provider: "SIMULATED",
        fromName: bp.fromName,
        fromEmail: bp.fromEmail,
        updatedAt: toInstant(new Date(FIXED_SEED_EPOCH_MS)),
      },
    });

    // Audit Logs (4 deterministic entries per org)
    const ownerUser = orgUsers.find((u) => u.id === bp.ownerId) ?? orgUsers[0];
    const secondaryAdmin =
      orgUsers.find(
        (u) =>
          u.role === "ADMIN" && u.id !== bp.ownerId && u.id !== GLOBAL_ADMIN_ID,
      ) ?? orgUsers[0];
    await prisma.organizationAuditLog.createMany({
      data: [
        {
          id: detUuid(UUID_NS.AUDIT_LOG, bp.orgIndex, 1),
          organizationId: bp.id,
          actorId: GLOBAL_ADMIN_ID,
          action: "ORG_LOCALIZATION_UPDATED",
          resource: "ORGANIZATION",
          metadata: {
            defaultLanguage: "vi",
            timezone: "Asia/Ho_Chi_Minh",
            nameDisplayOrder: "LAST_FIRST",
          },
          createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 6 * 86400000)),
        },
        {
          id: detUuid(UUID_NS.AUDIT_LOG, bp.orgIndex, 2),
          organizationId: bp.id,
          actorId: ownerUser.id,
          action: "MEMBER_ROLE_CHANGED",
          resource: "MEMBER",
          metadata: {
            targetEmail: orgUsers[5].email,
            previousRole: "INTERVIEWER",
            newRole: orgUsers[5].role,
          },
          createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 4 * 86400000)),
        },
        {
          id: detUuid(UUID_NS.AUDIT_LOG, bp.orgIndex, 3),
          organizationId: bp.id,
          actorId: secondaryAdmin.id,
          action: "MEMBER_ROLE_CHANGED",
          resource: "MEMBER",
          metadata: {
            targetEmail: orgUsers[6].email,
            previousRole: "MEMBER",
            newRole: orgUsers[6].role,
          },
          createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 2 * 86400000)),
        },
        {
          id: detUuid(UUID_NS.AUDIT_LOG, bp.orgIndex, 4),
          organizationId: bp.id,
          actorId: ownerUser.id,
          action: "ROLE_PERMISSIONS_UPDATED",
          resource: "ROLE_PERMISSIONS",
          metadata: {
            role: "INTERVIEWER",
            updatedPermissionsCount: 1,
          },
          createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 1 * 86400000)),
        },
      ],
    });

    // 1. Seed Deterministic Jobs
    const jobStatuses = buildDeterministicJobStatuses(bp.jobStatusCounts);
    const createdJobIds: string[] = [];
    const jobsToInsert: Prisma.JobCreateManyInput[] = [];

    for (let i = 0; i < jobStatuses.length; i++) {
      const baseConfig = BASE_JOB_CONFIGS[i % BASE_JOB_CONFIGS.length];
      const status = jobStatuses[i];
      const seedIdx = bp.orgIndex * 100 + i;
      const workplace = WORKPLACES[seedIdx % WORKPLACES.length];
      const location = LOCATIONS[seedIdx % LOCATIONS.length];
      const type = JOB_TYPES[(seedIdx + 1) % JOB_TYPES.length];
      const experienceLevel = EXP_LEVELS[(seedIdx + 2) % EXP_LEVELS.length];
      const salaryRange = SALARY_RANGES[(seedIdx + 3) % SALARY_RANGES.length];

      const jobId =
        bp.orgIndex === 1 && i === 1
          ? DEMO1_BACKEND_JOB_ID
          : bp.orgIndex === 1 && i === 8
            ? DEMO1_RECRUITER_JOB_ID
            : detUuid(UUID_NS.JOB, bp.orgIndex, i + 1);

      const jobAgeDays = 5 + ((i * 3 + bp.orgIndex * 2) % 45);
      const jobCreatedAt = toInstant(
        new Date(FIXED_SEED_EPOCH_MS - jobAgeDays * 86400000),
      );
      const creatorId =
        bp.orgIndex === 1 && (i === 1 || i === 8)
          ? GLOBAL_ADMIN_ID
          : jobCreatorPool[i % jobCreatorPool.length].id;

      jobsToInsert.push({
        id: jobId,
        title: baseConfig.title,
        department: baseConfig.department,
        location,
        workplace,
        type,
        experienceLevel,
        salaryRange,
        description: baseConfig.description,
        requirements: baseConfig.requirements,
        status,
        organizationId: bp.id,
        createdById: creatorId,
        createdAt: jobCreatedAt,
        updatedAt: jobCreatedAt,
      });
      createdJobIds.push(jobId);
    }

    await prisma.job.createMany({ data: jobsToInsert });

    // 2. Seed Deterministic Tracking Links & Exact Click Counts
    const selectedLinkTemplates = SEED_TRACKING_LINKS.slice(
      0,
      bp.trackingLinkCount,
    );
    const clickWeights = selectedLinkTemplates.map((l) => l.clicksCount);
    const exactClickRowCounts = allocateExactIntegers(
      bp.totalTrackingClickRows,
      clickWeights,
    );

    const createdTrackingLinks: Array<{
      id: string;
      name: string;
      source: SourcingChannel;
      customSource: string | null;
      jobId: string | null;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
      utmTerm: string | null;
      utmContent: string | null;
      isActive: boolean;
    }> = [];
    const trackingLinksToInsert: Prisma.TrackingLinkCreateManyInput[] = [];
    const clicksToInsert: Prisma.TrackingClickCreateManyInput[] = [];

    for (let li = 0; li < selectedLinkTemplates.length; li++) {
      const item = selectedLinkTemplates[li];
      const linkId = detUuid(UUID_NS.TRACKING_LINK, bp.orgIndex, li + 1);
      const assignedJobId =
        item.jobIndex !== null && createdJobIds[item.jobIndex]
          ? createdJobIds[item.jobIndex]
          : null;
      const linkCreatedAt = toInstant(
        new Date(FIXED_SEED_EPOCH_MS - item.ageDays * 86400000),
      );
      const token =
        bp.orgIndex === 1 ? item.token : `${item.token}-d${bp.orgIndex}`;
      const creatorId = jobCreatorPool[li % jobCreatorPool.length].id;

      trackingLinksToInsert.push({
        id: linkId,
        organizationId: bp.id,
        createdById: creatorId,
        name: item.name,
        token,
        source: item.source,
        customSource: item.customSource ?? null,
        jobId: assignedJobId,
        campaign: item.campaign ?? null,
        medium: item.medium ?? null,
        utmSource: item.utmSource ?? null,
        utmMedium: item.utmMedium ?? null,
        utmCampaign: item.utmCampaign ?? null,
        utmTerm: item.utmTerm ?? null,
        utmContent: item.utmContent ?? null,
        clicksCount: item.clicksCount,
        isActive: item.isActive,
        createdAt: linkCreatedAt,
        updatedAt: linkCreatedAt,
      });

      createdTrackingLinks.push({
        id: linkId,
        name: item.name,
        source: item.source,
        customSource: item.customSource ?? null,
        jobId: assignedJobId,
        utmSource: item.utmSource ?? null,
        utmMedium: item.utmMedium ?? null,
        utmCampaign: item.utmCampaign ?? null,
        utmTerm: item.utmTerm ?? null,
        utmContent: item.utmContent ?? null,
        isActive: item.isActive,
      });

      const sampleCount = exactClickRowCounts[li];
      const domain = getDomainForChannel(item.source);
      for (let c = 0; c < sampleCount; c++) {
        const clickOffsetMs = Math.floor(
          (((c * 17 + li * 5) % 997) / 997) * item.ageDays * 86400000,
        );
        const clickDate = toInstant(
          new Date(FIXED_SEED_EPOCH_MS - clickOffsetMs),
        );
        clicksToInsert.push({
          id: detUuid(UUID_NS.TRACKING_CLICK, bp.orgIndex, c + 1, li + 1),
          organizationId: bp.id,
          trackingLinkId: linkId,
          referrer: `https://${domain}/jobs/feed?ref=${token}`,
          referrerDomain: domain,
          ipHash: crypto
            .createHash("sha256")
            .update(`ip-${bp.orgIndex}-${li}-${c}-${token}`)
            .digest("hex")
            .slice(0, 16),
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          createdAt: clickDate,
        });
      }
    }

    await prisma.trackingLink.createMany({ data: trackingLinksToInsert });

    // 3. Seed Candidates, Applications, Notes & Interviews
    // For Demo 1, reserve 2 slots of 1-job candidates for E2E deterministic candidates
    const distEntries: Array<[0 | 1 | 2 | 3 | 4 | 5 | 6, number]> =
      bp.orgIndex === 1
        ? [
            [0, bp.candidateJobCountDist[0]],
            [1, bp.candidateJobCountDist[1] - 2],
            [2, bp.candidateJobCountDist[2]],
            [3, bp.candidateJobCountDist[3]],
            [4, bp.candidateJobCountDist[4]],
            [5, bp.candidateJobCountDist[5]],
            [6, bp.candidateJobCountDist[6]],
          ]
        : [
            [0, bp.candidateJobCountDist[0]],
            [1, bp.candidateJobCountDist[1]],
            [2, bp.candidateJobCountDist[2]],
            [3, bp.candidateJobCountDist[3]],
            [4, bp.candidateJobCountDist[4]],
            [5, bp.candidateJobCountDist[5]],
            [6, bp.candidateJobCountDist[6]],
          ];

    const nonPinnedJobCounts = buildInterleavedList(distEntries, 5);
    const jobCountsList: number[] =
      bp.orgIndex === 1 ? [1, 1, ...nonPinnedJobCounts] : nonPinnedJobCounts;

    // Reserve exact stage counts minus Demo 1's 2 pinned E2E applications (1 APPLIED + 1 SCREENING)
    const stageEntries: Array<[StageName, number]> =
      bp.orgIndex === 1
        ? [
            ["APPLIED", bp.stageCounts.APPLIED - 1],
            ["SCREENING", bp.stageCounts.SCREENING - 1],
            ["INTERVIEW", bp.stageCounts.INTERVIEW],
            ["OFFER", bp.stageCounts.OFFER],
            ["HIRED", bp.stageCounts.HIRED],
            ["REJECTED", bp.stageCounts.REJECTED],
          ]
        : [
            ["APPLIED", bp.stageCounts.APPLIED],
            ["SCREENING", bp.stageCounts.SCREENING],
            ["INTERVIEW", bp.stageCounts.INTERVIEW],
            ["OFFER", bp.stageCounts.OFFER],
            ["HIRED", bp.stageCounts.HIRED],
            ["REJECTED", bp.stageCounts.REJECTED],
          ];
    const interleavedNonPinnedStages = buildInterleavedList(stageEntries, 11);

    // Flatten applications plan first so exact stages & interview counts match blueprint 100%
    interface PlannedApp {
      id: string;
      candidateIdx: number;
      candidateId: string;
      jobIdx: number;
      jobId: string;
      stage: StageName;
      isPinnedE2E: boolean;
      createdAt: Date;
    }

    const totalAppsExpected = jobCountsList.reduce((a, b) => a + b, 0);
    const allStagesList: StageName[] = [];
    const pinnedAppIndices = new Set<number>();

    if (bp.orgIndex === 1) {
      allStagesList.push("APPLIED", "SCREENING", ...interleavedNonPinnedStages);
      pinnedAppIndices.add(0);
      pinnedAppIndices.add(1);
    } else {
      allStagesList.push(...interleavedNonPinnedStages);
    }

    if (allStagesList.length !== totalAppsExpected) {
      throw new Error(
        `[${bp.slug}] App count mismatch: ${allStagesList.length} stages vs ${totalAppsExpected} jobs`,
      );
    }

    const exactInterviewCounts = buildExactInterviewCounts(
      allStagesList,
      bp.totalInterviews,
      pinnedAppIndices,
    );

    const orgCandidateCount = jobCountsList.length;
    const candidatesToInsert: Array<
      Prisma.CandidateCreateManyInput & { id: string }
    > = [];
    const storedFilesToInsert: Prisma.StoredFileCreateManyInput[] = [];
    const applicationsToInsert: Array<
      Prisma.ApplicationCreateManyInput & { id: string }
    > = [];
    const candidateNotesToInsert: Prisma.CandidateNoteCreateManyInput[] = [];
    const applicationNotesToInsert: Prisma.ApplicationNoteCreateManyInput[] =
      [];
    const interviewsToInsert: Array<
      Prisma.InterviewCreateManyInput & { id: string }
    > = [];
    const cvTemplates: Array<{
      candidateId: string;
      storedFileId: string;
      fileName: string;
      fullName: string;
      email: string;
      phone: string;
      gender: string;
      targetRole: string;
    }> = [];

    const jobStageOrderCounter: Record<string, number> = {};
    const plannedApps: PlannedApp[] = [];

    for (let cIdx = 0; cIdx < orgCandidateCount; cIdx++) {
      const isKanbanE2E = bp.orgIndex === 1 && cIdx === 0;
      const isTestApplicantE2E = bp.orgIndex === 1 && cIdx === 1;

      const template = masterCandidatePool[bp.candidateNameOffset + cIdx];
      const candidateId = isKanbanE2E
        ? DEMO1_KANBAN_CANDIDATE_ID
        : isTestApplicantE2E
          ? DEMO1_TEST_CANDIDATE_ID
          : detUuid(UUID_NS.CANDIDATE, bp.orgIndex, cIdx + 1);
      const storedFileId = isKanbanE2E
        ? DEMO1_KANBAN_STORED_FILE_ID
        : isTestApplicantE2E
          ? DEMO1_TEST_STORED_FILE_ID
          : detUuid(UUID_NS.STORED_FILE, bp.orgIndex, cIdx + 1);

      const fullName = isKanbanE2E
        ? "Minh Kanban Tran"
        : isTestApplicantE2E
          ? "Test Applicant Nguyen"
          : template.name;
      const firstName = isKanbanE2E
        ? "Minh Kanban"
        : isTestApplicantE2E
          ? "Test Applicant"
          : template.firstName;
      const lastName = isKanbanE2E
        ? "Tran"
        : isTestApplicantE2E
          ? "Nguyen"
          : template.lastName;
      const email = isKanbanE2E
        ? "kanban-candidate@tun.io.vn"
        : isTestApplicantE2E
          ? "test-applicant@tun.io.vn"
          : template.email;
      const phone = isKanbanE2E
        ? "0908765432"
        : isTestApplicantE2E
          ? "0901234567"
          : template.phone;
      const gender =
        isKanbanE2E || isTestApplicantE2E ? "MALE" : template.gender;
      const dateOfBirth = isKanbanE2E
        ? new Date("1996-08-20T00:00:00Z")
        : isTestApplicantE2E
          ? new Date("1995-05-15T00:00:00Z")
          : template.dateOfBirth;

      const asciiBase = fullName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const fileName = isKanbanE2E
        ? "sample-resume-kanban.pdf"
        : isTestApplicantE2E
          ? "sample-resume-test-applicant.pdf"
          : `CV_${candidateId.slice(0, 8)}_${asciiBase || "Candidate"}.pdf`;

      const daysAgo = isKanbanE2E
        ? 5
        : isTestApplicantE2E
          ? 10
          : 2 + ((cIdx * 3) % 58);
      const candidateCreatedAt = toInstant(
        new Date(FIXED_SEED_EPOCH_MS - daysAgo * 86400000),
      );

      const jobCount = jobCountsList[cIdx];
      const selectedJobIndices: number[] = [];
      if (isKanbanE2E || isTestApplicantE2E) {
        selectedJobIndices.push(1); // Senior Backend Engineer (PUBLISHED)
      } else {
        for (let k = 0; k < jobCount; k++) {
          const picked =
            (cIdx * 5 + k * 3 + bp.orgIndex) % createdJobIds.length;
          if (!selectedJobIndices.includes(picked)) {
            selectedJobIndices.push(picked);
          } else {
            let alt = (picked + 1) % createdJobIds.length;
            while (selectedJobIndices.includes(alt)) {
              alt = (alt + 1) % createdJobIds.length;
            }
            selectedJobIndices.push(alt);
          }
        }
      }

      const primaryJobIdx = selectedJobIndices[0] ?? -1;
      const targetRole =
        primaryJobIdx >= 0
          ? BASE_JOB_CONFIGS[primaryJobIdx % BASE_JOB_CONFIGS.length].title
          : "Software & Product Specialist";

      cvTemplates.push({
        candidateId,
        storedFileId,
        fileName,
        fullName,
        email,
        phone,
        gender,
        targetRole,
      });

      candidatesToInsert.push({
        id: candidateId,
        organizationId: bp.id,
        firstName,
        lastName,
        gender,
        dateOfBirth: toInstant(dateOfBirth),
        email,
        phone,
        resumeUrl: `/haihire-resumes/tenants/${bp.id}/resumes/${fileName}`,
        resumeFileName: fileName,
        resumeFileSize: 2400,
        resumeMimeType: "application/pdf",
        resumeFileId: storedFileId,
        createdAt: candidateCreatedAt,
        updatedAt: candidateCreatedAt,
      });

      const candNoteAuthor =
        isKanbanE2E || isTestApplicantE2E
          ? orgUsers[0]
          : noteAuthorPool[cIdx % noteAuthorPool.length];
      candidateNotesToInsert.push({
        id: detUuid(UUID_NS.CANDIDATE_NOTE, bp.orgIndex, cIdx + 1),
        organizationId: bp.id,
        candidateId,
        authorId: candNoteAuthor.id,
        authorName: candNoteAuthor.displayName,
        authorRole: candNoteAuthor.role,
        content: isKanbanE2E
          ? "Ứng viên mẫu cho Kanban drag & drop test."
          : isTestApplicantE2E
            ? "Ứng viên mẫu phục vụ automated tests."
            : "Ứng viên tiềm năng trong Talent Pool.",
        isEdited: false,
        createdAt: candidateCreatedAt,
        updatedAt: candidateCreatedAt,
      });

      for (let j = 0; j < selectedJobIndices.length; j++) {
        const appIdx = plannedApps.length;
        const jobIdx = selectedJobIndices[j];
        const stage = allStagesList[appIdx];
        const appId = isKanbanE2E
          ? DEMO1_KANBAN_APP_ID
          : isTestApplicantE2E
            ? DEMO1_TEST_APP_ID
            : detUuid(UUID_NS.APPLICATION, bp.orgIndex, appIdx + 1);

        const appCreatedAt = isKanbanE2E
          ? toInstant(new Date(FIXED_SEED_EPOCH_MS - 5 * 86400000))
          : isTestApplicantE2E
            ? toInstant(new Date(FIXED_SEED_EPOCH_MS - 6 * 86400000))
            : toInstant(
                new Date(
                  Math.min(
                    FIXED_SEED_EPOCH_MS - 1800000,
                    candidateCreatedAt.getTime() +
                      (1 + ((cIdx + j * 7) % 36)) * 3600000,
                  ),
                ),
              );

        plannedApps.push({
          id: appId,
          candidateIdx: cIdx,
          candidateId,
          jobIdx,
          jobId: createdJobIds[jobIdx],
          stage,
          isPinnedE2E: isKanbanE2E || isTestApplicantE2E,
          createdAt: appCreatedAt,
        });
      }
    }

    // Generate PDFs & update file sizes before creating StoredFile + Candidate + Application
    const UPLOAD_BATCH = 40;
    const uploadedByCandidateId = new Map<
      string,
      { resumeUrl: string; sizeBytes: number; fileName: string }
    >();
    for (let b = 0; b < cvTemplates.length; b += UPLOAD_BATCH) {
      const chunk = cvTemplates.slice(b, b + UPLOAD_BATCH);
      const uploadedChunk = await Promise.all(
        chunk.map(async (tpl) => {
          const uploaded = await cvStorage.uploadCandidateCv(
            bp.id,
            tpl.fileName,
            {
              fullName: tpl.fullName,
              email: tpl.email,
              phone: tpl.phone,
              gender: tpl.gender,
              targetRole: tpl.targetRole,
            },
          );
          storedFilesToInsert.push({
            id: tpl.storedFileId,
            organizationId: bp.id,
            objectKey: uploaded.objectKey,
            originalName: uploaded.fileName,
            mimeType: "application/pdf",
            sizeBytes: uploaded.sizeBytes,
            checksum: uploaded.checksum,
          });
          return [
            tpl.candidateId,
            {
              resumeUrl: uploaded.resumeUrl,
              sizeBytes: uploaded.sizeBytes,
              fileName: uploaded.fileName,
            },
          ] as const;
        }),
      );
      for (const [candId, meta] of uploadedChunk) {
        uploadedByCandidateId.set(candId, meta);
      }
    }

    for (const cand of candidatesToInsert) {
      const meta = uploadedByCandidateId.get(cand.id);
      if (meta) {
        cand.resumeUrl = meta.resumeUrl;
        cand.resumeFileName = meta.fileName;
        cand.resumeFileSize = meta.sizeBytes;
      }
    }

    // Build Applications, ApplicationNotes, & Interviews deterministically
    let interviewSeq = 0;
    const activeLinks = createdTrackingLinks.filter((l) => l.isActive);

    for (let appIdx = 0; appIdx < plannedApps.length; appIdx++) {
      const pApp = plannedApps[appIdx];
      const stage = pApp.stage;
      const orderKey = `${pApp.jobId}_${stage}`;
      const isKanban = pApp.id === DEMO1_KANBAN_APP_ID;
      const isTestApp = pApp.id === DEMO1_TEST_APP_ID;

      let orderIndex: number;
      if (isKanban) {
        orderIndex = 0;
      } else if (isTestApp) {
        orderIndex = 1;
      } else {
        jobStageOrderCounter[orderKey] =
          (jobStageOrderCounter[orderKey] || 1) + 1;
        orderIndex = jobStageOrderCounter[orderKey];
      }

      const interviewCount = exactInterviewCounts[appIdx];
      let matchScore = 65 + ((pApp.candidateIdx * 5 + pApp.jobIdx * 7) % 31);
      let noteText = "";

      if (stage === "APPLIED" || stage === "SCREENING") {
        matchScore = isKanban
          ? 88
          : isTestApp
            ? 82
            : 68 + ((pApp.candidateIdx + pApp.jobIdx * 5) % 25);
        noteText = isKanban
          ? "Đơn ứng tuyển phục vụ Kanban drag & drop E2E test."
          : isTestApp
            ? "Đơn ứng tuyển giai đoạn SCREENING phục vụ E2E test."
            : "Hồ sơ nộp trực tuyến qua Cổng tuyển dụng ATS. Đánh giá sơ loại hồ sơ đạt chuẩn ứng tuyển.";
      } else if (stage === "INTERVIEW") {
        matchScore = 80 + ((pApp.candidateIdx + pApp.jobIdx) % 16);
        noteText =
          interviewCount === 0
            ? "Chờ lên lịch phỏng vấn chuyên sâu. Đã hoàn thành sơ vấn qua điện thoại."
            : "Đang trong quy trình phỏng vấn.";
      } else if (stage === "OFFER" || stage === "HIRED") {
        matchScore = 90 + ((pApp.candidateIdx + pApp.jobIdx) % 9);
        noteText = `Đánh giá xuất sắc qua ${interviewCount} vòng phỏng vấn. Đã gửi thư mời làm việc.`;
      } else if (stage === "REJECTED") {
        matchScore = 55 + ((pApp.candidateIdx + pApp.jobIdx) % 20);
        noteText =
          interviewCount === 0
            ? "Từ chối từ vòng hồ sơ: Kỹ năng hoặc số năm kinh nghiệm chưa đáp ứng yêu cầu tối thiểu của vị trí."
            : `Không đạt sau ${interviewCount} vòng phỏng vấn chuyên môn.`;
      }

      for (let r = 1; r <= interviewCount; r++) {
        interviewSeq++;
        const isCompleted = stage === "INTERVIEW" ? r < interviewCount : true;
        const intv = sharedSlotManager.generateInterviewObject(
          r,
          interviewCount,
          isCompleted,
          bp.orgIndex * 1000 + appIdx,
          interviewerPool,
        );
        const scorecard =
          stage === "OFFER" || stage === "HIRED"
            ? {
                overallRating: 5,
                recommendation: "STRONG_YES",
                feedback: `Ứng viên hoàn thành xuất sắc vòng ${r}.`,
              }
            : Prisma.DbNull;

        interviewsToInsert.push({
          id: detUuid(UUID_NS.INTERVIEW, bp.orgIndex, interviewSeq),
          organizationId: bp.id,
          applicationId: pApp.id,
          scheduledAt: intv.scheduledAt,
          type: intv.type,
          format: intv.format,
          linkOrLocation: intv.linkOrLocation,
          interviewerId: intv.interviewerId,
          interviewer: intv.interviewer,
          round: intv.round,
          scorecard,
          notes: intv.notes,
          createdAt: toInstant(new Date(FIXED_SEED_EPOCH_MS - 3 * 86400000)),
          updatedAt: toInstant(new Date(FIXED_SEED_EPOCH_MS)),
        });
      }

      const isAttributed =
        !pApp.isPinnedE2E &&
        (pApp.candidateIdx * 13 + pApp.jobIdx * 7) % 10 < 8;
      let trackingLinkId: string | null = null;
      let sourceChannel: SourcingChannel = SourcingChannel.DIRECT;
      let sourceDetails: string | null = null;
      let referrerDomain: string | null = null;
      let utmSource: string | null = null;
      let utmMedium: string | null = null;
      let utmCampaign: string | null = null;
      let utmTerm: string | null = null;
      let utmContent: string | null = null;

      if (isAttributed && activeLinks.length > 0) {
        const candidateLinks = activeLinks.filter(
          (l) => l.jobId === pApp.jobId || l.jobId === null,
        );
        const chosenLink =
          candidateLinks.length > 0
            ? candidateLinks[
                (pApp.candidateIdx + appIdx) % candidateLinks.length
              ]
            : activeLinks[(pApp.candidateIdx + appIdx) % activeLinks.length];
        trackingLinkId = chosenLink.id;
        sourceChannel = chosenLink.source;
        sourceDetails = chosenLink.customSource || chosenLink.name;
        referrerDomain = getDomainForChannel(chosenLink.source);
        utmSource = chosenLink.utmSource;
        utmMedium = chosenLink.utmMedium;
        utmCampaign = chosenLink.utmCampaign;
        utmTerm = chosenLink.utmTerm;
        utmContent = chosenLink.utmContent;
      } else if (!pApp.isPinnedE2E) {
        sourceDetails = "Ứng tuyển trực tiếp từ Career Site";
        referrerDomain =
          (pApp.candidateIdx + pApp.jobIdx) % 2 === 0 ? "google.com" : null;
      }

      const fileMeta = uploadedByCandidateId.get(pApp.candidateId)!;
      const candRow = candidatesToInsert[pApp.candidateIdx];

      applicationsToInsert.push({
        id: pApp.id,
        organizationId: bp.id,
        candidateId: pApp.candidateId,
        jobId: pApp.jobId,
        stage,
        matchScore,
        resumeUrl: fileMeta.resumeUrl,
        resumeFileName: fileMeta.fileName,
        resumeFileSize: fileMeta.sizeBytes,
        resumeMimeType: "application/pdf",
        resumeFileId: candRow.resumeFileId!,
        orderIndex,
        trackingLinkId,
        sourceChannel,
        sourceDetails,
        referrerDomain,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        createdAt: pApp.createdAt,
        updatedAt: pApp.createdAt,
      });

      const appNoteAuthor = pApp.isPinnedE2E
        ? orgUsers[0]
        : noteAuthorPool[appIdx % noteAuthorPool.length];
      applicationNotesToInsert.push({
        id: detUuid(UUID_NS.APPLICATION_NOTE, bp.orgIndex, appIdx + 1),
        organizationId: bp.id,
        applicationId: pApp.id,
        authorId: appNoteAuthor.id,
        authorName: appNoteAuthor.displayName,
        authorRole: appNoteAuthor.role,
        content: noteText,
        isEdited: false,
        createdAt: pApp.createdAt,
        updatedAt: pApp.createdAt,
      });
    }

    await prisma.storedFile.createMany({ data: storedFilesToInsert });
    await prisma.candidate.createMany({ data: candidatesToInsert });
    await prisma.application.createMany({ data: applicationsToInsert });
    await prisma.applicationNote.createMany({ data: applicationNotesToInsert });
    await prisma.candidateNote.createMany({ data: candidateNotesToInsert });
    await prisma.interview.createMany({ data: interviewsToInsert });
    await prisma.trackingClick.createMany({ data: clicksToInsert });

    // 4. Seed Deterministic Notifications (all 4 kinds) for Global Admin, Org Owner & Other Members
    const minMs = 60 * 1000;
    const nowSlotAnchorMs = Date.now();
    const upcomingIvs = interviewsToInsert.filter(
      (iv) => new Date(iv.scheduledAt).getTime() > nowSlotAnchorMs,
    );
    const orderedIvs = [
      ...upcomingIvs,
      ...interviewsToInsert.filter(
        (iv) => new Date(iv.scheduledAt).getTime() <= nowSlotAnchorMs,
      ),
    ];
    const recentApps = [
      ...applicationsToInsert.filter(
        (a) => a.stage === "APPLIED" || a.stage === "SCREENING",
      ),
      ...applicationsToInsert,
    ];

    const KIND_CYCLE: readonly NotificationKind[] = [
      "applicationReceived",
      "interviewScheduled",
      "interviewChanged",
      "interviewCancelled",
    ];
    const MINUTES_STEPS = [
      5, 18, 42, 95, 180, 260, 420, 900, 1500, 2200, 3100, 4500, 5200, 6100,
      7200, 8400,
    ];

    const notificationsToInsert: Prisma.NotificationCreateManyInput[] = [];
    let notifSeq = 0;

    const pushAdminInbox = (targetUserId: string) => {
      const { total, unread } = bp.adminNotifications;
      for (let i = 0; i < total; i++) {
        notifSeq++;
        const kind = KIND_CYCLE[i % KIND_CYCLE.length];
        const resourceId =
          kind === "applicationReceived"
            ? recentApps[(i + bp.orgIndex) % recentApps.length].id
            : orderedIvs[(i * 2 + bp.orgIndex) % orderedIvs.length].id;
        const createdAt = toInstant(
          new Date(FIXED_SEED_EPOCH_MS - MINUTES_STEPS[i] * minMs),
        );
        const isUnread = i < unread;
        const readAt = isUnread
          ? null
          : toInstant(new Date(createdAt.getTime() + 45 * minMs));

        notificationsToInsert.push({
          id: detUuid(UUID_NS.NOTIFICATION, bp.orgIndex, notifSeq),
          organizationId: bp.id,
          userId: targetUserId,
          kind,
          resourceId,
          createdAt,
          readAt,
        });
      }
    };

    // Identical comprehensive 4-kind inbox for both Global Admin (`admin@tun.io.vn`) and Org Owner (`adminX@tun.io.vn`)
    pushAdminInbox(GLOBAL_ADMIN_ID);
    pushAdminInbox(bp.ownerId);

    // 12 deterministic notifications distributed across other members in this org (scoped to their RBAC permissions)
    const otherMembers = orgUsers.filter(
      (u) =>
        u.id !== GLOBAL_ADMIN_ID && u.id !== bp.ownerId && u.role !== "MEMBER",
    );
    for (let m = 0; m < bp.otherMemberNotifications; m++) {
      notifSeq++;
      const target = otherMembers[m % otherMembers.length];
      const allowedKinds: readonly NotificationKind[] =
        target.role === "INTERVIEWER"
          ? ["interviewScheduled", "interviewChanged", "interviewCancelled"]
          : KIND_CYCLE;
      const kind = allowedKinds[m % allowedKinds.length];
      const resourceId =
        kind === "applicationReceived"
          ? recentApps[(m + 3) % recentApps.length].id
          : orderedIvs[(m + 5) % orderedIvs.length].id;
      const createdAt = toInstant(
        new Date(FIXED_SEED_EPOCH_MS - (30 + m * 120) * minMs),
      );
      notificationsToInsert.push({
        id: detUuid(UUID_NS.NOTIFICATION, bp.orgIndex, notifSeq),
        organizationId: bp.id,
        userId: target.id,
        kind,
        resourceId,
        createdAt,
        readAt:
          m % 3 === 2
            ? toInstant(new Date(createdAt.getTime() + 20 * minMs))
            : null,
      });
    }

    await prisma.notification.createMany({ data: notificationsToInsert });

    // 5. Seed 10 deterministic ActivityLog entries per org
    const appById = new Map(applicationsToInsert.map((a) => [a.id, a]));
    const recruiterActor =
      orgUsers.find((u) => u.role === "RECRUITER") ?? orgUsers[0];
    const activityLogsToInsert: Prisma.ActivityLogCreateManyInput[] = [];

    for (let aIdx = 0; aIdx < 5; aIdx++) {
      const app = recentApps[aIdx];
      activityLogsToInsert.push({
        id: detUuid(UUID_NS.ACTIVITY_LOG, bp.orgIndex, aIdx + 1),
        organizationId: bp.id,
        candidateId: app.candidateId,
        applicationId: app.id,
        type: "APPLIED",
        title: "Hồ sơ ứng tuyển mới",
        description: `Ứng viên đã nộp hồ sơ (${app.sourceChannel}).`,
        actorId: null,
        actorName: "Career Site",
        actorRole: null,
        metadata: { sourceChannel: app.sourceChannel },
        createdAt: app.createdAt,
        updatedAt: app.createdAt,
      });
    }
    for (let ivIdx = 0; ivIdx < 5; ivIdx++) {
      const iv = orderedIvs[ivIdx];
      const app = appById.get(iv.applicationId);
      if (!app) continue;
      activityLogsToInsert.push({
        id: detUuid(UUID_NS.ACTIVITY_LOG, bp.orgIndex, 6 + ivIdx),
        organizationId: bp.id,
        candidateId: app.candidateId,
        applicationId: app.id,
        type: "INTERVIEW_SCHEDULED",
        title: `Đặt lịch phỏng vấn Vòng ${iv.round}`,
        description: `Phân công ${iv.interviewer} phỏng vấn (${iv.type}).`,
        actorId: recruiterActor.id,
        actorName: recruiterActor.displayName,
        actorRole: recruiterActor.role,
        metadata: { interviewId: iv.id, interviewerId: iv.interviewerId },
        createdAt: toInstant(
          new Date(FIXED_SEED_EPOCH_MS - (ivIdx + 1) * 3 * 3600000),
        ),
        updatedAt: toInstant(
          new Date(FIXED_SEED_EPOCH_MS - (ivIdx + 1) * 3 * 3600000),
        ),
      });
    }
    await prisma.activityLog.createMany({ data: activityLogsToInsert });

    summaryRows.push({
      slug: bp.slug,
      jobs: `${jobsToInsert.length} (${bp.jobStatusCounts.PUBLISHED}/${bp.jobStatusCounts.DRAFT}/${bp.jobStatusCounts.CLOSED})`,
      links: trackingLinksToInsert.length,
      clicks: clicksToInsert.length,
      candidates: candidatesToInsert.length,
      applications: applicationsToInsert.length,
      interviews: interviewsToInsert.length,
      notifications: notificationsToInsert.length,
    });

    console.log(
      `✅ ${bp.name}: ${jobsToInsert.length} jobs, ${trackingLinksToInsert.length} links (${clicksToInsert.length} clicks), ${candidatesToInsert.length} candidates, ${applicationsToInsert.length} applications, ${interviewsToInsert.length} interviews, ${notificationsToInsert.length} notifications, 4 audit logs, ${activityLogsToInsert.length} activity logs.`,
    );
  }

  console.log("\n==================================================");
  console.log("📊 FINAL DETERMINISTIC MULTI-ORG SEED SUMMARY");
  console.log("==================================================");
  console.log(
    `- Users seeded: 15 (Global Admin ${DEMO_ACCOUNTS.ADMIN.email} + 4 Org Owners admin1..4@tun.io.vn + 10 Team/Interviewers, Password: ${DEMO_PASSWORD})`,
  );
  console.log(`- Organizations: 4 (demo-1, demo-2, demo-3, demo-4)`);
  console.log(
    `- Memberships: 60 (15 users × 4 orgs covering all 5 RBAC roles)`,
  );
  for (const row of summaryRows) {
    console.log(
      `  • ${row.slug}: ${row.jobs} jobs | ${row.links} links / ${row.clicks} clicks | ${row.candidates} cands | ${row.applications} apps | ${row.interviews} ivs | ${row.notifications} notifs`,
    );
  }
  console.log("==================================================");
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  seed()
    .then(() => {
      console.log("🎉 Seed finished successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
