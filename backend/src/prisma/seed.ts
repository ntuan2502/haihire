import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.ts";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../constants/auth.constants.ts";

const defaultPasswordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const VIETNAMESE_FIRST_NAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đoàn", "Trịnh", "Lưu", "Mai",
];

const VIETNAMESE_MIDDLE_NAMES = [
  "Văn", "Thị", "Hồng", "Minh", "Đức", "Hoàng", "Thanh", "Quốc", "Gia", "Hải",
  "Đình", "Xuân", "Ngọc", "Tuấn", "Bảo", "Anh", "Phương", "Thu", "Khánh", "Hữu",
];

const VIETNAMESE_LAST_NAMES = [
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
  email: string;
  phone: string;
  candidateIndex: number;
}> {
  const candidates: Array<{
    name: string;
    email: string;
    phone: string;
    candidateIndex: number;
  }> = [];
  const usedNames = new Set<string>();

  // ~70% Vietnamese (140), ~30% International (60) = 200 candidates
  const targetVietnamese = 140;
  const targetIntl = 60;

  let vnCount = 0;
  for (const fn of VIETNAMESE_FIRST_NAMES) {
    for (const mn of VIETNAMESE_MIDDLE_NAMES) {
      for (const ln of VIETNAMESE_LAST_NAMES) {
        if (vnCount >= targetVietnamese) break;
        const name = `${fn} ${mn} ${ln}`;
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
    ];
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
        : `https://meet.google.com/ats-demo-${candidateIdx}-${round}`;

    return {
      date: slot.date,
      time: slot.time,
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
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://ats_user:ats_password@localhost:5432/ats_db?schema=public";

  try {
    await db.connect({ url: dbUrl });
  } catch {
    // already connected or composer client
  }

  console.log("==================================================");
  console.log("🧹 1. Cleaning old database records...");
  console.log("==================================================");

  await db.orm.public.Interview.all().then((intvs) =>
    Promise.all(intvs.map((i) => db.orm.public.Interview.where((x) => x.id.eq(i.id)).delete())),
  );

  await db.orm.public.Application.all().then((apps) =>
    Promise.all(apps.map((a) => db.orm.public.Application.where((x) => x.id.eq(a.id)).delete())),
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

  const adminUserId = crypto.randomUUID();
  const adminOrgId = crypto.randomUUID();
  const memberUserId = crypto.randomUUID();

  // 1. Create Org "Admin"
  await db.orm.public.Organization.upsert({
    create: {
      id: adminOrgId,
      name: "Admin",
      slug: "admin",
      ownerId: adminUserId,
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
      id: crypto.randomUUID(),
      organizationId: adminOrgId,
      userId: adminUserId,
      role: "ADMIN",
    },
    update: {},
    conflictOn: { id: "00000000-0000-0000-0000-000000000001" },
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
      id: crypto.randomUUID(),
      organizationId: adminOrgId,
      userId: memberUserId,
      role: "MEMBER",
    },
    update: {},
    conflictOn: { id: "00000000-0000-0000-0000-000000000002" },
  });

  console.log(`- Org: Admin (id: ${adminOrgId})`);
  console.log(`- Admin: ${DEMO_ACCOUNTS.ADMIN.email} (Password: ${DEMO_PASSWORD})`);
  console.log(`- Member: ${DEMO_ACCOUNTS.MEMBER.email} (Password: ${DEMO_PASSWORD})`);

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
  const WORKPLACES = ["Hybrid", "Remote", "On-site"];
  const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
  const EXP_LEVELS = ["Entry-level", "Mid-level", "Senior-level", "Lead", "Executive"];
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
    const status = statusPool[i];
    statusCounts[status]++;

    const workplace = WORKPLACES[Math.floor(Math.random() * WORKPLACES.length)];
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const type = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    const experienceLevel = EXP_LEVELS[Math.floor(Math.random() * EXP_LEVELS.length)];
    const salaryRange = SALARY_RANGES[Math.floor(Math.random() * SALARY_RANGES.length)];

    const jobId = crypto.randomUUID();
    const jobAgeDays = 5 + Math.floor((i * 3.5) % 45);
    const jobCreatedAt = new Date(Date.now() - jobAgeDays * 86400000);

    await db.orm.public.Job.upsert({
      create: {
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
        organizationId: adminOrgId,
        createdById: adminUserId,
        createdAt: jobCreatedAt,
      },
      update: {},
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
    gender: string;
    dateOfBirth: Date;
    email: string;
    phone: string;
    notes: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeFileSize: number;
    resumeMimeType: string;
    createdAt: Date;
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
    createdAt: Date;
  }> = [];

  const interviewsToInsert: Array<{
    id: string;
    applicationId: string;
    date: string;
    time: string;
    type: any;
    format: string;
    linkOrLocation: string;
    interviewer: string;
    round: number;
    scorecard: string | null;
    notes: string | null;
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

    let gender = "Male";
    if (femaleHints.some((h) => name.includes(h))) {
      gender = "Female";
    } else if (maleHints.some((h) => name.includes(h))) {
      gender = "Male";
    } else {
      gender = index % 2 === 0 ? "Male" : "Female";
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
    const resumeUrl = `/ats-resumes/${fileName}`;
    const resumeFileSize = Math.floor(500000 + Math.random() * 1500000); // 500KB - 2MB
    const candidateId = crypto.randomUUID();

    const nameParts = candidate.name.trim().split(/\s+/);
    const firstName = nameParts[0] || candidate.name;
    const lastName = nameParts.slice(1).join(" ") || nameParts[0];

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
      dateOfBirth,
      email: candidate.email,
      phone: candidate.phone,
      notes: "Ứng viên tiềm năng trong Talent Pool.",
      resumeUrl,
      resumeFileName: fileName,
      resumeFileSize,
      resumeMimeType: "application/pdf",
      createdAt: candidateCreatedAt,
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
                date: intv.date,
                time: intv.time,
                type: intv.type,
                format: intv.format,
                linkOrLocation: intv.linkOrLocation,
                interviewer: intv.interviewer,
                round: intv.round,
                scorecard: null,
                notes: intv.notes,
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
              date: intv.date,
              time: intv.time,
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
                date: intv.date,
                time: intv.time,
                type: intv.type,
                format: intv.format,
                linkOrLocation: intv.linkOrLocation,
                interviewer: intv.interviewer,
                round: intv.round,
                scorecard: null,
                notes: intv.notes,
              });
            }
          }
        }

        const appOffsetMs = Math.floor((1 + ((candidate.candidateIndex + j * 7) % 36)) * 3600000);
        const appTime = Math.min(Date.now() - 1800000, candidateCreatedAt.getTime() + appOffsetMs);
        const appCreatedAt = new Date(appTime);

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
          createdAt: appCreatedAt,
        });
      }
    }
  }

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
    const key = `${intv.date} ${intv.time}`;
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
