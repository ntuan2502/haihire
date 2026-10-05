import crypto from "node:crypto";
import { env } from "../config/env";
import bcrypt from "bcryptjs";
import { db } from "./db.ts";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants.ts";
import { toInstant } from "../common/date.util.ts";
import { SourcingChannel } from "@haihire/shared";

const defaultPasswordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const VIETNAMESE_LAST_NAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đoàn", "Trịnh", "Lưu", "Mai",
];

const VIETNAMESE_MIDDLE_NAMES = [
  "Văn", "Thị", "Hồng", "Minh", "Đức", "Hoàng", "Thanh", "Quốc", "Gia", "Hải",
  "Đình", "Xuân", "Ngọc", "Tuấn", "Bảo", "Anh", "Phương", "Thu", "Khánh", "Hữu",
];

const VIETNAMESE_FIRST_NAMES = [
  "An", "Bình", "Cường", "Dũng", "Em", "Phong", "Giang", "Hương", "Huy", "Khoa",
  "Linh", "Minh", "Nam", "Oanh", "Phúc", "Quân", "Sơn", "Trang", "Tùng", "Uyên",
  "Việt", "Xuân", "Yến", "Thắng", "Thảo", "Hà", "Kiên", "Tú", "Hậu", "Loan",
];

const INTL_FIRST_NAMES = [
  "James", "Alexander", "Sarah", "Emily", "Michael", "David", "Jessica", "Daniel",
  "Sophia", "Lucas", "Oliver", "Emma", "Ethan", "Liam", "Ava", "Noah",
  "Chloe", "Mason", "Grace", "Logan", "Benjamin", "Charlotte", "Henry", "Amelia",
];

const INTL_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson",
  "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez",
  "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
];

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

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;

function generate200UniqueCandidates(): Array<{
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  candidateIndex: number;
}> {
  const candidates: Array<{
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    candidateIndex: number;
  }> = [];
  const usedNames = new Set<string>();

  // ~70% Vietnamese (140), ~30% International (60) = 200 candidates
  const targetVietnamese = 140;
  const targetIntl = 60;

  let vnCount = 0;
  for (const ln of VIETNAMESE_LAST_NAMES) {
    for (const mn of VIETNAMESE_MIDDLE_NAMES) {
      for (const fn of VIETNAMESE_FIRST_NAMES) {
        if (vnCount >= targetVietnamese) break;
        const name = `${ln} ${mn} ${fn}`;
        if (!usedNames.has(name)) {
          usedNames.add(name);
          vnCount++;
          const normalized = name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ".");
          const email = `${normalized}.${vnCount + 10}@example.com`;
          const phone = `09${String(10000000 + vnCount * 137).slice(-8)}`;
          candidates.push({
            name,
            firstName: fn,
            lastName: `${ln} ${mn}`,
            email,
            phone,
            candidateIndex: vnCount,
          });
        }
      }
      if (vnCount >= targetVietnamese) break;
    }
    if (vnCount >= targetVietnamese) break;
  }

  let intlCount = 0;
  for (const fn of INTL_FIRST_NAMES) {
    for (const ln of INTL_LAST_NAMES) {
      if (intlCount >= targetIntl) break;
      const name = `${fn} ${ln}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        intlCount++;
        const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
        const email = `${normalized}.${intlCount + 200}@example.com`;
        const phone = `09${String(50000000 + intlCount * 179).slice(-8)}`;
        candidates.push({
          name,
          firstName: fn,
          lastName: ln,
          email,
          phone,
          candidateIndex: vnCount + intlCount,
        });
      }
    }
    if (intlCount >= targetIntl) break;
  }

  // Shuffle candidate list
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Re-index candidates 1..200
  return candidates.map((c, idx) => ({
    ...c,
    candidateIndex: idx + 1,
  }));
}

class InterviewSlotManager {
  private usedSlots = new Set<string>();
  private upcomingSlots: Array<{ date: string; time: string }> = [];
  private pastTier1Slots: Array<{ date: string; time: string }> = [];
  private pastTier2Slots: Array<{ date: string; time: string }> = [];
  private pastTier3Slots: Array<{ date: string; time: string }> = [];

  constructor() {
    this.initQueues();
  }

  private initQueues() {
    const DAILY_TIMES = [
      "08:30",
      "09:15",
      "10:00",
      "10:45",
      "11:30",
      "13:30",
      "14:15",
      "15:00",
      "15:45",
      "16:30",
      "17:15",
    ];

    const now = new Date();

    // 1. Upcoming slots: Day +1 to Day +50 (skipping weekends)
    let upDay = 1;
    while (this.upcomingSlots.length < 400) {
      const d = new Date(now);
      d.setDate(now.getDate() + upDay);
      upDay++;
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of DAILY_TIMES) {
        this.upcomingSlots.push({ date: dateStr, time });
      }
    }

    // 2. Past Tier 3 (recent past: 1-25 days ago, skipping weekends)
    let pDay = 1;
    while (this.pastTier3Slots.length < 300) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of DAILY_TIMES) {
        this.pastTier3Slots.push({ date: dateStr, time });
      }
    }

    // 3. Past Tier 2 (mid past: 26-55 days ago, skipping weekends)
    while (this.pastTier2Slots.length < 300) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of DAILY_TIMES) {
        this.pastTier2Slots.push({ date: dateStr, time });
      }
    }

    // 4. Past Tier 1 (older past: 56-100 days ago, skipping weekends)
    while (this.pastTier1Slots.length < 400) {
      const d = new Date(now);
      d.setDate(now.getDate() - pDay);
      pDay++;
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of DAILY_TIMES) {
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
    } else {
      if (round === totalRounds || round >= 3) {
        slot = this.pastTier3Slots.shift();
      } else if (round === 2 || (round === totalRounds - 1 && totalRounds >= 2)) {
        slot = this.pastTier2Slots.shift();
      } else {
        slot = this.pastTier1Slots.shift();
      }
    }

    if (!slot) {
      slot = this.generateFallbackSlot(isCompleted);
    }

    const key = `${slot.date} ${slot.time}`;
    if (this.usedSlots.has(key)) {
      return this.generateFallbackSlot(isCompleted);
    }
    this.usedSlots.add(key);
    return slot;
  }

  private fallbackCounter = 90;
  private generateFallbackSlot(isCompleted: boolean): { date: string; time: string } {
    const DAILY_TIMES = [
      "08:30", "09:15", "10:00", "10:45", "11:30",
      "13:30", "14:15", "15:00", "15:45", "16:30", "17:15",
    ];
    while (true) {
      this.fallbackCounter++;
      const now = new Date();
      const d = new Date(now);
      const dayOffset = isCompleted ? -this.fallbackCounter : this.fallbackCounter;
      d.setDate(now.getDate() + dayOffset);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      for (const time of DAILY_TIMES) {
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
    candidateIdx: number,
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
    const format = formats[(candidateIdx + round) % formats.length];

    const interviewers = [
      "Nguyễn Văn A (Engineering Lead)",
      "Trần Minh Đức (CTO)",
      "Phạm Thu Hương (HR Director)",
      "Sarah Jenkins (VP Product)",
      "Lê Hoàng Long (Principal Architect)",
      "Đặng Quốc Bảo (Senior Tech Lead)",
      "Vũ Thanh Hà (Head of Talent)",
    ];
    const interviewer = interviewers[(candidateIdx * 2 + round) % interviewers.length];

    const linkOrLocation =
      format === "OFFICE"
        ? "Tầng 5, Tòa nhà Keangnam Landmark 72, Hà Nội"
        : `https://meet.google.com/haihire-demo-${candidateIdx}-${round}`;

    const scheduledAt = toInstant(new Date(`${slot.date}T${slot.time}:00Z`));

    return {
      scheduledAt,
      type,
      format,
      linkOrLocation,
      interviewer,
      notes: isCompleted
        ? `Vòng ${round} đã hoàn thành. Đánh giá ứng viên đáp ứng tốt tiêu chuẩn.`
        : `Lịch hẹn phỏng vấn Vòng ${round}. Vui lòng kiểm tra tài liệu trước cuộc họp.`,
      round,
    };
  }

  public getUsedCount(): number {
    return this.usedSlots.size;
  }
}

let pendingSeed: Promise<void> | undefined;

export async function runSeed(): Promise<void> {
  try {
    await db.connect({ url: env.DATABASE_URL });
  } catch {
    // already connected or composer client
  }

  console.log("==================================================");
  console.log("🧹 1. Cleaning old database records...");
  console.log("==================================================");

  await db.orm.public.EmailLog.all().then((logs) =>
    Promise.all(logs.map((l) => db.orm.public.EmailLog.where((x) => x.id.eq(l.id)).delete())),
  );

  await db.orm.public.EmailSetting.all().then((sets) =>
    Promise.all(sets.map((s) => db.orm.public.EmailSetting.where((x) => x.id.eq(s.id)).delete())),
  );

  await db.orm.public.EmailTemplate.all().then((tmpls) =>
    Promise.all(tmpls.map((t) => db.orm.public.EmailTemplate.where((x) => x.id.eq(t.id)).delete())),
  );

  await db.orm.public.ActivityLog.all().then((acts) =>
    Promise.all(acts.map((a) => db.orm.public.ActivityLog.where((x) => x.id.eq(a.id)).delete())),
  );

  await db.orm.public.CandidateDocument.all().then((docs) =>
    Promise.all(docs.map((d) => db.orm.public.CandidateDocument.where((x) => x.id.eq(d.id)).delete())),
  );

  await db.orm.public.Interview.all().then((intvs) =>
    Promise.all(intvs.map((i) => db.orm.public.Interview.where((x) => x.id.eq(i.id)).delete())),
  );

  await db.orm.public.Application.all().then((apps) =>
    Promise.all(apps.map((a) => db.orm.public.Application.where((x) => x.id.eq(a.id)).delete())),
  );

  await db.orm.public.TrackingClick.all().then((clicks) =>
    Promise.all(clicks.map((c) => db.orm.public.TrackingClick.where((x) => x.id.eq(c.id)).delete())),
  );

  await db.orm.public.TrackingLink.all().then((links) =>
    Promise.all(links.map((l) => db.orm.public.TrackingLink.where((x) => x.id.eq(l.id)).delete())),
  );

  await db.orm.public.Candidate.all().then((cands) =>
    Promise.all(cands.map((c) => db.orm.public.Candidate.where((x) => x.id.eq(c.id)).delete())),
  );

  await db.orm.public.InviteLink.all().then((links) =>
    Promise.all(links.map((l) => db.orm.public.InviteLink.where((x) => x.id.eq(l.id)).delete())),
  );

  await db.orm.public.OrganizationMember.all().then((members) =>
    Promise.all(members.map((m) => db.orm.public.OrganizationMember.where((x) => x.id.eq(m.id)).delete())),
  );

  await db.orm.public.Job.all().then((jobs) =>
    Promise.all(jobs.map((j) => db.orm.public.Job.where((x) => x.id.eq(j.id)).delete())),
  );

  await db.orm.public.User.all().then((users) =>
    Promise.all(users.map((u) => db.orm.public.User.where((x) => x.id.eq(u.id)).delete())),
  );

  await db.orm.public.Organization.all().then((orgs) =>
    Promise.all(orgs.map((o) => db.orm.public.Organization.where((x) => x.id.eq(o.id)).delete())),
  );

  console.log("==================================================");
  console.log("🏢 2. Seeding Organization & Demo Users...");
  console.log("==================================================");

  const adminUserId = "00000000-0000-0000-0000-000000000001";
  const adminOrgId = "00000000-0000-0000-0000-000000000002";
  const memberUserId = "00000000-0000-0000-0000-000000000003";

  // 1. Create Org "Admin"
  await db.orm.public.Organization.upsert({
    create: {
      id: adminOrgId,
      name: "Admin",
      slug: "admin",
      ownerId: adminUserId,
      updatedAt: toInstant(),
    },
    update: {
      name: "Admin",
      ownerId: adminUserId,
    },
    conflictOn: { slug: "admin" },
  });

  // 2. Create Admin User
  await db.orm.public.User.upsert({
    create: {
      id: adminUserId,
      email: DEMO_ACCOUNTS.ADMIN.email,
      name: DEMO_ACCOUNTS.ADMIN.name,
      role: DEMO_ACCOUNTS.ADMIN.role,
      password: defaultPasswordHash,
      organizationId: adminOrgId,
      updatedAt: toInstant(),
    },
    update: {
      password: defaultPasswordHash,
      name: DEMO_ACCOUNTS.ADMIN.name,
      role: DEMO_ACCOUNTS.ADMIN.role,
      organizationId: adminOrgId,
    },
    conflictOn: { email: DEMO_ACCOUNTS.ADMIN.email },
  });

  // 3. Create Org Member relationship
  await db.orm.public.OrganizationMember.upsert({
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      organizationId: adminOrgId,
      userId: adminUserId,
      role: "ADMIN",
      updatedAt: toInstant(),
    },
    update: {},
    conflictOn: { id: "00000000-0000-0000-0000-000000000011" },
  });

  // 4. Create Member User
  await db.orm.public.User.upsert({
    create: {
      id: memberUserId,
      email: DEMO_ACCOUNTS.MEMBER.email,
      name: DEMO_ACCOUNTS.MEMBER.name,
      role: DEMO_ACCOUNTS.MEMBER.role,
      password: defaultPasswordHash,
      organizationId: adminOrgId,
      updatedAt: toInstant(),
    },
    update: {
      password: defaultPasswordHash,
      name: DEMO_ACCOUNTS.MEMBER.name,
      role: DEMO_ACCOUNTS.MEMBER.role,
      organizationId: adminOrgId,
    },
    conflictOn: { email: DEMO_ACCOUNTS.MEMBER.email },
  });

  await db.orm.public.OrganizationMember.upsert({
    create: {
      id: "00000000-0000-0000-0000-000000000012",
      organizationId: adminOrgId,
      userId: memberUserId,
      role: "MEMBER",
      updatedAt: toInstant(),
    },
    update: {},
    conflictOn: { id: "00000000-0000-0000-0000-000000000012" },
  });

  // 5. Seed Email Settings for Admin Organization
  await db.orm.public.EmailSetting.upsert({
    create: {
      id: "00000000-0000-0000-0000-000000000021",
      organizationId: adminOrgId,
      provider: "SIMULATED",
      fromName: "Admin Recruitment Team",
      fromEmail: "careers@tun.io.vn",
      updatedAt: toInstant(),
    },
    update: {
      provider: "SIMULATED",
      fromName: "Admin Recruitment Team",
      fromEmail: "careers@tun.io.vn",
    },
    conflictOn: { organizationId: adminOrgId },
  });

  console.log(`- Org: Admin (id: ${adminOrgId})`);
  console.log(`- Admin: ${DEMO_ACCOUNTS.ADMIN.email} (Password: ${DEMO_PASSWORD})`);
  console.log(`- Member: ${DEMO_ACCOUNTS.MEMBER.email} (Password: ${DEMO_PASSWORD})`);
  console.log(`- Email Settings: SIMULATED (careers@tun.io.vn)`);

  console.log("==================================================");
  console.log("💼 3. Seeding Exactly 20 Jobs (Random Statuses & Details)...");
  console.log("==================================================");

  // Guarantee all 3 statuses are present while the count of each is randomized
  const statusPool: Array<"PUBLISHED" | "DRAFT" | "CLOSED"> = [
    "PUBLISHED", "PUBLISHED", "PUBLISHED",
    "DRAFT", "DRAFT", "DRAFT",
    "CLOSED", "CLOSED", "CLOSED",
  ];
  const allPossibleStatuses: Array<"PUBLISHED" | "DRAFT" | "CLOSED"> = [
    "PUBLISHED",
    "DRAFT",
    "CLOSED",
  ];
  while (statusPool.length < 20) {
    statusPool.push(
      allPossibleStatuses[Math.floor(Math.random() * allPossibleStatuses.length)],
    );
  }
  // Shuffle statuses
  for (let i = statusPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
  }

  const LOCATIONS = [
    "Hanoi, Vietnam",
    "Ho Chi Minh City, Vietnam",
    "Da Nang, Vietnam",
    "Singapore / Remote",
    "Tokyo, Japan / Remote",
    "Global Remote",
  ];
  const WORKPLACES = ["HYBRID", "REMOTE", "ON_SITE"] as const;
  const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
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
  ];

  const createdJobIds: string[] = [];
  const statusCounts: Record<string, number> = { PUBLISHED: 0, DRAFT: 0, CLOSED: 0 };

  for (let i = 0; i < 20; i++) {
    const baseConfig = BASE_JOB_CONFIGS[i % BASE_JOB_CONFIGS.length];
    // Guarantee that Job index 1 (Senior Backend Engineer) & Job index 8 (Senior Technical Recruiter) are ALWAYS PUBLISHED for E2E
    const isCriticalTestJob =
      i === 1 ||
      i === 8 ||
      baseConfig.title.includes("Senior Backend Engineer") ||
      baseConfig.title.includes("Senior Technical Recruiter");
    const status = isCriticalTestJob ? "PUBLISHED" : statusPool[i];
    statusCounts[status]++;

    const workplace = WORKPLACES[Math.floor(Math.random() * WORKPLACES.length)];
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const type = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    const experienceLevel = EXP_LEVELS[Math.floor(Math.random() * EXP_LEVELS.length)];
    const salaryRange = SALARY_RANGES[Math.floor(Math.random() * SALARY_RANGES.length)];

    const jobId =
      i === 1
        ? "00000000-0000-0000-0000-000000000101"
        : i === 8
          ? "00000000-0000-0000-0000-000000000108"
          : crypto.randomUUID();
    const jobAgeDays = 5 + Math.floor((i * 3.5) % 45);
    const jobCreatedAt = new Date(Date.now() - jobAgeDays * 86400000);

    await db.orm.public.Job.upsert({
      create: {
        id: jobId,
        title: baseConfig.title,
        department: baseConfig.department,
        location,
        workplace: workplace as "ON_SITE" | "HYBRID" | "REMOTE",
        type,
        experienceLevel: experienceLevel as "ENTRY_LEVEL" | "MID_LEVEL" | "SENIOR_LEVEL" | "LEAD" | "EXECUTIVE",
        salaryRange,
        description: baseConfig.description,
        requirements: baseConfig.requirements,
        status,
        organizationId: adminOrgId,
        createdById: adminUserId,
        createdAt: toInstant(jobCreatedAt),
        updatedAt: toInstant(jobCreatedAt),
      },
      update: {
        title: baseConfig.title,
        status,
        organizationId: adminOrgId,
      },
      conflictOn: { id: jobId },
    });

    createdJobIds.push(jobId);
    console.log(
      `  [Job ${i + 1}/20] [${status}] ${baseConfig.title} (${baseConfig.department} - ${workplace} - ${salaryRange})`,
    );
  }

  console.log(`\n📊 Thống kê trạng thái 20 vị trí:`);
  console.log(`   - PUBLISHED (Đang mở): ${statusCounts.PUBLISHED}`);
  console.log(`   - DRAFT (Bản nháp):    ${statusCounts.DRAFT}`);
  console.log(`   - CLOSED (Đã đóng):    ${statusCounts.CLOSED}`);

  console.log("==================================================");
  console.log("🔗 3.5. Seeding 24 Diverse Tracking Links & Clicks...");
  console.log("==================================================");

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

  const SEED_TRACKING_LINKS: Array<{
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
  }> = [
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
  ];

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

  const clicksToInsert: Array<{
    id: string;
    trackingLinkId: string;
    referrer: string | null;
    referrerDomain: string | null;
    ipHash: string;
    userAgent: string;
    createdAt: Temporal.Instant;
  }> = [];

  for (const item of SEED_TRACKING_LINKS) {
    const linkId = crypto.randomUUID();
    const assignedJobId =
      item.jobIndex !== null && createdJobIds[item.jobIndex]
        ? createdJobIds[item.jobIndex]
        : null;

    const linkCreatedAt = new Date(Date.now() - item.ageDays * 86400000);

    await db.orm.public.TrackingLink.upsert({
      create: {
        id: linkId,
        organizationId: adminOrgId,
        createdById: adminUserId,
        name: item.name,
        token: item.token,
        source: item.source,
        customSource: item.customSource || null,
        jobId: assignedJobId,
        campaign: item.campaign || null,
        medium: item.medium || null,
        utmSource: item.utmSource || null,
        utmMedium: item.utmMedium || null,
        utmCampaign: item.utmCampaign || null,
        utmTerm: item.utmTerm || null,
        utmContent: item.utmContent || null,
        clicksCount: item.clicksCount,
        isActive: item.isActive,
        createdAt: toInstant(linkCreatedAt),
        updatedAt: toInstant(linkCreatedAt),
      },
      update: {},
      conflictOn: { id: linkId },
    });

    createdTrackingLinks.push({
      id: linkId,
      name: item.name,
      source: item.source,
      customSource: item.customSource || null,
      jobId: assignedJobId,
      utmSource: item.utmSource || null,
      utmMedium: item.utmMedium || null,
      utmCampaign: item.utmCampaign || null,
      utmTerm: item.utmTerm || null,
      utmContent: item.utmContent || null,
      isActive: item.isActive,
    });

    // Generate representative TrackingClick records for this link
    if (item.clicksCount > 0) {
      const clickSamplesCount = Math.min(item.clicksCount, 40);
      const domain = getDomainForChannel(item.source);

      for (let c = 0; c < clickSamplesCount; c++) {
        const clickOffsetMs = Math.floor(Math.random() * item.ageDays * 86400000);
        const clickDate = new Date(Date.now() - clickOffsetMs);

        clicksToInsert.push({
          id: crypto.randomUUID(),
          trackingLinkId: linkId,
          referrer: `https://${domain}/jobs/feed?ref=${item.token}`,
          referrerDomain: domain,
          ipHash: crypto.createHash("sha256").update(`ip-${c}-${item.token}`).digest("hex").slice(0, 16),
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          createdAt: toInstant(clickDate),
        });
      }
    }
  }

  console.log(`✅ Đã tạo thành công ${createdTrackingLinks.length} liên kết theo dõi (đủ 15 kênh nguồn, active/inactive, cụ thể job và toàn công ty).`);

  console.log("==================================================");
  console.log("👥 4. Seeding Exactly 200 Unique Candidates (0-6 jobs each)...");
  console.log("==================================================");

  const uniqueCandidates = generate200UniqueCandidates();
  console.log(`✅ Đã khởi tạo danh sách ${uniqueCandidates.length} ứng viên có họ và tên hoàn toàn khác nhau (không trùng lặp).`);

  // Phân bổ số lượng job cho 200 ứng viên (0 đến 6 job):
  // 0 job: 24 ứng viên (chưa ứng tuyển - Talent Pool)
  // 1 job: 76 ứng viên
  // 2 job: 40 ứng viên
  // 3 job: 30 ứng viên
  // 4 job: 16 ứng viên
  // 5 job: 10 ứng viên
  // 6 job:  4 ứng viên
  // Tổng = 24 + 76 + 40 + 30 + 16 + 10 + 4 = 200 ứng viên
  const jobCountsPool: number[] = [
    ...Array(24).fill(0),
    ...Array(76).fill(1),
    ...Array(40).fill(2),
    ...Array(30).fill(3),
    ...Array(16).fill(4),
    ...Array(10).fill(5),
    ...Array(4).fill(6),
  ];

  // Shuffle pool để phân bổ ngẫu nhiên cho từng ứng viên
  for (let i = jobCountsPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [jobCountsPool[i], jobCountsPool[j]] = [jobCountsPool[j], jobCountsPool[i]];
  }

  const jobDistributionStats: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };
  const stageStats: Record<string, number> = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
  };

  const candidatesToInsert: Array<{
    id: string;
    organizationId: string;
    name: string;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth: Temporal.Instant;
    email: string;
    phone: string;
    notes: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeFileSize: number;
    resumeMimeType: string;
    createdAt: Temporal.Instant;
    updatedAt: Temporal.Instant;
  }> = [];

  const applicationsToInsert: Array<{
    id: string;
    candidateId: string;
    jobId: string;
    stage: (typeof STAGES)[number];
    matchScore: number;
    resumeUrl: string;
    resumeFileName: string;
    resumeFileSize: number;
    resumeMimeType: string;
    notes: string;
    orderIndex: number;
    trackingLinkId: string | null;
    sourceChannel: SourcingChannel;
    sourceDetails: string | null;
    referrerDomain: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    createdAt: Temporal.Instant;
    updatedAt: Temporal.Instant;
  }> = [];

  const interviewsToInsert: Array<{
    id: string;
    applicationId: string;
    scheduledAt: Temporal.Instant;
    type: "HR_SCREENING" | "TECHNICAL" | "CULTURE_FIT" | "FINAL_ROUND" | "ASSESSMENT";
    format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
    linkOrLocation: string;
    interviewer: string;
    round: number;
    scorecard: string | null;
    notes: string | null;
    updatedAt: Temporal.Instant;
  }> = [];

  function getCandidateDemographics(name: string, index: number) {
    const femaleHints = [
      "Thị", "Hồng", "Thảo", "Hương", "Trang", "Uyên", "Yến", "Loan", "Oanh", "Linh",
      "Sarah", "Emily", "Jessica", "Sophia", "Emma", "Ava", "Chloe", "Grace", "Charlotte", "Amelia",
    ];
    const maleHints = [
      "Văn", "Đức", "Hoàng", "Quốc", "Hải", "Tuấn", "Dũng", "Cường", "Nam", "Thắng", "Kiên", "Tú",
      "James", "Alexander", "Michael", "David", "Daniel", "Lucas", "Oliver", "Ethan", "Liam", "Noah",
      "Mason", "Logan", "Benjamin", "Henry",
    ];

    let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
    if (femaleHints.some((h) => name.includes(h))) {
      gender = "FEMALE";
    } else if (maleHints.some((h) => name.includes(h))) {
      gender = "MALE";
    } else {
      gender = index % 2 === 0 ? "MALE" : "FEMALE";
    }

    // Realistic date of birth (ages 22 - 38)
    const birthYear = 1988 + (index % 15);
    const birthMonth = (index % 12) + 1;
    const birthDay = ((index * 3) % 27) + 1;
    const dateOfBirth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

    return { gender, dateOfBirth };
  }

  const jobStageOrderCounter: Record<string, number> = {};
  const slotManager = new InterviewSlotManager();

  for (let i = 0; i < uniqueCandidates.length; i++) {
    const candidate = uniqueCandidates[i];
    const jobCount = jobCountsPool[i];
    jobDistributionStats[jobCount]++;

    const fileName = `CV_${candidate.name.replace(/\s+/g, "_")}.pdf`;
    const resumeUrl = `/haihire-resumes/${fileName}`;
    const resumeFileSize = Math.floor(500000 + Math.random() * 1500000); // 500KB - 2MB
    const candidateId = crypto.randomUUID();

    const firstName = candidate.firstName;
    const lastName = candidate.lastName;

    const { gender, dateOfBirth } = getCandidateDemographics(candidate.name, i);
    // Candidates spread over past 60 days
    const daysAgo = ((i * 0.3) % 60) + (i % 2 === 0 ? 0.05 : 0.2);
    const candidateCreatedAt = new Date(Date.now() - Math.floor(daysAgo * 86400000));

    candidatesToInsert.push({
      id: candidateId,
      organizationId: adminOrgId,
      name: candidate.name,
      firstName,
      lastName,
      gender,
      dateOfBirth: toInstant(dateOfBirth),
      email: candidate.email,
      phone: candidate.phone,
      notes: "Ứng viên tiềm năng trong Talent Pool.",
      resumeUrl,
      resumeFileName: fileName,
      resumeFileSize,
      resumeMimeType: "application/pdf",
      createdAt: toInstant(candidateCreatedAt),
      updatedAt: toInstant(candidateCreatedAt),
    });

    if (jobCount === 0) {
      stageStats.APPLIED++;
    } else {
      const shuffledJobIds = [...createdJobIds].sort(() => 0.5 - Math.random());
      const selectedJobIds = shuffledJobIds.slice(0, jobCount);

      for (let j = 0; j < selectedJobIds.length; j++) {
        const jobId = selectedJobIds[j];
        const stage = STAGES[(candidate.candidateIndex + j) % STAGES.length];
        stageStats[stage]++;

        const orderKey = `${jobId}_${stage}`;
        jobStageOrderCounter[orderKey] = (jobStageOrderCounter[orderKey] || 0) + 1;
        const orderIndex = jobStageOrderCounter[orderKey];

        const appId = crypto.randomUUID();
        let notes = "";
        let matchScore = 65 + ((candidate.candidateIndex + j * 7) % 31);

        if (stage === "APPLIED" || stage === "SCREENING") {
          notes = "Hồ sơ nộp trực tuyến qua Cổng tuyển dụng ATS. Đánh giá sơ loại hồ sơ đạt chuẩn ứng tuyển.";
        } else if (stage === "INTERVIEW") {
          const roll = Math.random();
          let interviewCount = 0;
          if (roll < 0.20) {
            interviewCount = 0;
          } else if (roll < 0.70) {
            interviewCount = 1;
          } else if (roll < 0.90) {
            interviewCount = 2;
          } else {
            interviewCount = 3;
          }

          matchScore = 80 + ((candidate.candidateIndex + j) % 16);
          if (interviewCount === 0) {
            notes = "Chờ lên lịch phỏng vấn chuyên sâu. Đã hoàn thành sơ vấn qua điện thoại.";
          } else {
            notes = "Đang trong quy trình phỏng vấn.";
            for (let r = 1; r <= interviewCount; r++) {
              const isCompleted = r < interviewCount;
              const intv = slotManager.generateInterviewObject(r, interviewCount, isCompleted, candidate.candidateIndex + j);
              interviewsToInsert.push({
                id: crypto.randomUUID(),
                applicationId: appId,
                scheduledAt: intv.scheduledAt,
                type: intv.type,
                format: intv.format,
                linkOrLocation: intv.linkOrLocation,
                interviewer: intv.interviewer,
                round: intv.round,
                scorecard: null,
                notes: intv.notes,
                updatedAt: toInstant(),
              });
            }
          }
        } else if (stage === "OFFER" || stage === "HIRED") {
          const interviewCount = Math.floor(Math.random() * 3) + 1;
          matchScore = 90 + ((candidate.candidateIndex + j) % 9);
          notes = `Đánh giá xuất sắc qua ${interviewCount} vòng phỏng vấn. Đã gửi thư mời làm việc.`;

          for (let r = 1; r <= interviewCount; r++) {
            const intv = slotManager.generateInterviewObject(r, interviewCount, true, candidate.candidateIndex + j);
            interviewsToInsert.push({
              id: crypto.randomUUID(),
              applicationId: appId,
              scheduledAt: intv.scheduledAt,
              type: intv.type,
              format: intv.format,
              linkOrLocation: intv.linkOrLocation,
              interviewer: intv.interviewer,
              round: intv.round,
              scorecard: JSON.stringify({
                overallRating: 5,
                recommendation: "STRONG_YES",
                feedback: `Ứng viên hoàn thành xuất sắc vòng ${r}.`,
              }),
              notes: intv.notes,
              updatedAt: toInstant(),
            });
          }
        } else if (stage === "REJECTED") {
          const interviewCount = Math.floor(Math.random() * 4);
          matchScore = 55 + ((candidate.candidateIndex + j) % 20);

          if (interviewCount === 0) {
            notes = "Từ chối từ vòng hồ sơ: Kỹ năng hoặc số năm kinh nghiệm chưa đáp ứng yêu cầu tối thiểu của vị trí.";
          } else {
            notes = `Không đạt sau ${interviewCount} vòng phỏng vấn chuyên môn.`;
            for (let r = 1; r <= interviewCount; r++) {
              const intv = slotManager.generateInterviewObject(r, interviewCount, true, candidate.candidateIndex + j);
              interviewsToInsert.push({
                id: crypto.randomUUID(),
                applicationId: appId,
                scheduledAt: intv.scheduledAt,
                type: intv.type,
                format: intv.format,
                linkOrLocation: intv.linkOrLocation,
                interviewer: intv.interviewer,
                round: intv.round,
                scorecard: null,
                notes: intv.notes,
                updatedAt: toInstant(),
              });
            }
          }
        }

        const appOffsetMs = Math.floor((1 + ((candidate.candidateIndex + j * 7) % 36)) * 3600000);
        const appTime = Math.min(Date.now() - 1800000, candidateCreatedAt.getTime() + appOffsetMs);
        const appCreatedAt = new Date(appTime);

        // Attribution mapping: ~80% attributed to a tracking link, ~20% direct
        const isAttributed = ((candidate.candidateIndex * 13 + j * 7) % 10) < 8;
        let trackingLinkId: string | null = null;
        let sourceChannel: SourcingChannel = SourcingChannel.DIRECT;
        let sourceDetails: string | null = null;
        let referrerDomain: string | null = null;
        let utmSource: string | null = null;
        let utmMedium: string | null = null;
        let utmCampaign: string | null = null;
        let utmTerm: string | null = null;
        let utmContent: string | null = null;

        const activeLinks = createdTrackingLinks.filter((l) => l.isActive);

        if (isAttributed && activeLinks.length > 0) {
          // Find links that match this jobId, or company-wide links (jobId == null)
          const candidateLinks = activeLinks.filter(
            (l) => l.jobId === jobId || l.jobId === null,
          );
          const chosenLink =
            candidateLinks.length > 0
              ? candidateLinks[(candidate.candidateIndex + j) % candidateLinks.length]
              : activeLinks[(candidate.candidateIndex + j) % activeLinks.length];

          trackingLinkId = chosenLink.id;
          sourceChannel = chosenLink.source;
          sourceDetails = chosenLink.customSource || chosenLink.name;
          referrerDomain = getDomainForChannel(chosenLink.source);
          utmSource = chosenLink.utmSource;
          utmMedium = chosenLink.utmMedium;
          utmCampaign = chosenLink.utmCampaign;
          utmTerm = chosenLink.utmTerm;
          utmContent = chosenLink.utmContent;
        } else {
          sourceChannel = SourcingChannel.DIRECT;
          sourceDetails = "Ứng tuyển trực tiếp từ Career Site";
          referrerDomain = (candidate.candidateIndex + j) % 2 === 0 ? "google.com" : null;
        }

        applicationsToInsert.push({
          id: appId,
          candidateId,
          jobId,
          stage,
          matchScore,
          resumeUrl,
          resumeFileName: fileName,
          resumeFileSize,
          resumeMimeType: "application/pdf",
          notes,
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
          createdAt: toInstant(appCreatedAt),
          updatedAt: toInstant(appCreatedAt),
        });
      }
    }
  }

  // ============================================================================
  // Deterministic candidates and applications for E2E automated tests
  // ============================================================================
  const testCandidateId = "00000000-0000-0000-0000-000000000201";
  const kanbanCandidateId = "00000000-0000-0000-0000-000000000202";

  candidatesToInsert.push({
    id: testCandidateId,
    organizationId: adminOrgId,
    name: "Nguyen Test Applicant",
    firstName: "Test Applicant",
    lastName: "Nguyen",
    gender: "MALE",
    dateOfBirth: toInstant(new Date("1995-05-15T00:00:00Z")),
    email: "test-applicant@tun.io.vn",
    phone: "0901234567",
    notes: "Ứng viên mẫu phục vụ automated tests.",
    resumeUrl: "/haihire-resumes/sample-resume.pdf",
    resumeFileName: "sample-resume.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    createdAt: toInstant(new Date(Date.now() - 10 * 86400000)),
    updatedAt: toInstant(new Date(Date.now() - 10 * 86400000)),
  });

  candidatesToInsert.push({
    id: kanbanCandidateId,
    organizationId: adminOrgId,
    name: "Tran Minh Kanban",
    firstName: "Minh Kanban",
    lastName: "Tran",
    gender: "MALE",
    dateOfBirth: toInstant(new Date("1996-08-20T00:00:00Z")),
    email: "kanban-candidate@tun.io.vn",
    phone: "0908765432",
    notes: "Ứng viên mẫu cho Kanban drag & drop test.",
    resumeUrl: "/haihire-resumes/sample-resume.pdf",
    resumeFileName: "sample-resume.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    createdAt: toInstant(new Date(Date.now() - 5 * 86400000)),
    updatedAt: toInstant(new Date(Date.now() - 5 * 86400000)),
  });

  // Guarantee Candidate 2 (Kanban) is in APPLIED stage for Job 1 (Senior Backend Engineer)
  applicationsToInsert.push({
    id: "00000000-0000-0000-0000-000000000301",
    candidateId: kanbanCandidateId,
    jobId: createdJobIds[1], // Senior Backend Engineer (NestJS / PostgreSQL)
    stage: "APPLIED",
    matchScore: 88,
    resumeUrl: "/haihire-resumes/sample-resume.pdf",
    resumeFileName: "sample-resume.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    notes: "Đơn ứng tuyển phục vụ Kanban drag & drop E2E test.",
    orderIndex: 0,
    trackingLinkId: null,
    sourceChannel: SourcingChannel.DIRECT,
    sourceDetails: null,
    referrerDomain: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    createdAt: toInstant(new Date(Date.now() - 5 * 86400000)),
    updatedAt: toInstant(new Date(Date.now() - 5 * 86400000)),
  });
  stageStats.APPLIED++;

  // Guarantee Candidate 1 is in SCREENING stage for Job 1 so that both stages are available
  applicationsToInsert.push({
    id: "00000000-0000-0000-0000-000000000302",
    candidateId: testCandidateId,
    jobId: createdJobIds[1],
    stage: "SCREENING",
    matchScore: 82,
    resumeUrl: "/haihire-resumes/sample-resume.pdf",
    resumeFileName: "sample-resume.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    notes: "Đơn ứng tuyển giai đoạn SCREENING phục vụ E2E test.",
    orderIndex: 1,
    trackingLinkId: null,
    sourceChannel: SourcingChannel.DIRECT,
    sourceDetails: null,
    referrerDomain: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    createdAt: toInstant(new Date(Date.now() - 6 * 86400000)),
    updatedAt: toInstant(new Date(Date.now() - 6 * 86400000)),
  });
  stageStats.SCREENING++;

  console.log(`\n⏳ Đang lưu ${candidatesToInsert.length} ứng viên vào cơ sở dữ liệu...`);
  const BATCH_SIZE = 50;
  for (let b = 0; b < candidatesToInsert.length; b += BATCH_SIZE) {
    const chunk = candidatesToInsert.slice(b, b + BATCH_SIZE);
    await Promise.all(
      chunk.map((cand) =>
        db.orm.public.Candidate.upsert({
          create: cand,
          update: {},
          conflictOn: { id: cand.id },
        }),
      ),
    );
  }

  console.log(`\n⏳ Đang lưu ${applicationsToInsert.length} bản ghi ứng tuyển vào cơ sở dữ liệu (xử lý theo lô)...`);
  for (let b = 0; b < applicationsToInsert.length; b += BATCH_SIZE) {
    const chunk = applicationsToInsert.slice(b, b + BATCH_SIZE);
    await Promise.all(
      chunk.map((app) =>
        db.orm.public.Application.upsert({
          create: app,
          update: {},
          conflictOn: { id: app.id },
        }),
      ),
    );
    process.stdout.write(`\r   Tiến độ: ${Math.min(b + BATCH_SIZE, applicationsToInsert.length)}/${applicationsToInsert.length} bản ghi`);
  }

  // Kiểm tra nghiêm ngặt tính độc nhất của khung giờ phỏng vấn
  const slotCollisionCheck = new Set<string>();
  for (const intv of interviewsToInsert) {
    const key = intv.scheduledAt.toString();
    if (slotCollisionCheck.has(key)) {
      throw new Error(`CRITICAL: Trùng khung giờ phỏng vấn: ${key}`);
    }
    slotCollisionCheck.add(key);
  }
  console.log(`\n⏳ Đang lưu ${interviewsToInsert.length} lịch phỏng vấn vào cơ sở dữ liệu (đã xác minh 100% khung giờ độc nhất)...`);
  for (let b = 0; b < interviewsToInsert.length; b += BATCH_SIZE) {
    const chunk = interviewsToInsert.slice(b, b + BATCH_SIZE);
    await Promise.all(
      chunk.map((intv) =>
        db.orm.public.Interview.upsert({
          create: intv,
          update: {},
          conflictOn: { id: intv.id },
        }),
      ),
    );
  }
  console.log(`   ✨ Đã lưu thành công: toàn bộ ${interviewsToInsert.length} khung giờ phỏng vấn không hề bị trùng lặp.`);

  console.log(`\n⏳ Đang lưu ${clicksToInsert.length} lượt nhấp (TrackingClick) vào cơ sở dữ liệu...`);
  for (let b = 0; b < clicksToInsert.length; b += BATCH_SIZE) {
    const chunk = clicksToInsert.slice(b, b + BATCH_SIZE);
    await Promise.all(
      chunk.map((click) =>
        db.orm.public.TrackingClick.upsert({
          create: click,
          update: {},
          conflictOn: { id: click.id },
        }),
      ),
    );
  }
  console.log(`   ✨ Đã lưu thành công ${clicksToInsert.length} lượt nhấp mẫu (TrackingClick).`);

  console.log(`\n\n✅ Thành công! Đã gieo mầm cố định 200 ứng viên độc nhất (tổng ${applicationsToInsert.length} đơn ứng tuyển):`);
  console.log(`   - 0 job (Chưa ứng tuyển):  ${jobDistributionStats[0]} ứng viên`);
  console.log(`   - 1 job:                   ${jobDistributionStats[1]} ứng viên`);
  console.log(`   - 2 jobs:                  ${jobDistributionStats[2]} ứng viên`);
  console.log(`   - 3 jobs:                  ${jobDistributionStats[3]} ứng viên`);
  console.log(`   - 4 jobs:                  ${jobDistributionStats[4]} ứng viên`);
  console.log(`   - 5 jobs:                  ${jobDistributionStats[5]} ứng viên`);
  console.log(`   - 6 jobs:                  ${jobDistributionStats[6]} ứng viên`);
  console.log(`   --------------------------------------------------`);
  console.log(`   - APPLIED (Đã nộp hồ sơ):  ${stageStats.APPLIED} đơn (0 lịch phỏng vấn)`);
  console.log(`   - SCREENING (Sơ loại):      ${stageStats.SCREENING} đơn (0 lịch phỏng vấn)`);
  console.log(`   - INTERVIEW (Phỏng vấn):    ${stageStats.INTERVIEW} đơn (0, 1 hoặc nhiều lịch)`);
  console.log(`   - OFFER (Đề nghị việc làm): ${stageStats.OFFER} đơn (1-3 lịch phỏng vấn)`);
  console.log(`   - HIRED (Đã tuyển dụng):    ${stageStats.HIRED} đơn (1-3 lịch phỏng vấn)`);
  console.log(`   - REJECTED (Đã từ chối):    ${stageStats.REJECTED} đơn (0-3 lịch phỏng vấn)`);
  console.log(`   --------------------------------------------------`);
  const attributedCount = applicationsToInsert.filter((a) => a.trackingLinkId).length;
  console.log(`📊 Thống kê Source Tracking (Theo dõi nguồn):`);
  console.log(`   - Tổng liên kết theo dõi:   ${createdTrackingLinks.length} liên kết (đầy đủ 15 kênh nguồn, 5 UTM, active/inactive)`);
  console.log(`   - Tổng lượt nhấp chi tiết: ${clicksToInsert.length} lượt nhấp`);
  console.log(`   - Đã ghi nhận nguồn:       ${attributedCount}/${applicationsToInsert.length} đơn (${Math.round((attributedCount / applicationsToInsert.length) * 100)}%)`);
  console.log(`   - Trực tiếp / Chưa rõ:      ${applicationsToInsert.length - attributedCount} đơn (${Math.round(((applicationsToInsert.length - attributedCount) / applicationsToInsert.length) * 100)}%)`);
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
