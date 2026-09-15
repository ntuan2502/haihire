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
  "Chloe", "Mason", "Grace", "Logan",
];

const INTL_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson",
  "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez",
  "Thompson", "White", "Harris", "Sanchez",
];

interface JobTemplate {
  title: string;
  department: string;
  location: string;
  workplace: string;
  type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "REMOTE";
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  salaryRange: string;
  experienceLevel: string;
  description: string;
  requirements: string;
}

const JOB_TEMPLATES: JobTemplate[] = [
  {
    title: "Senior Full-Stack Engineer (React / Node.js)",
    department: "Engineering",
    location: "Hanoi, Vietnam",
    workplace: "Hybrid",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$2,500 - $4,000 / month",
    experienceLevel: "Senior",
    description: `Chúng tôi đang tìm kiếm Senior Full-Stack Engineer tài năng tham gia phát triển nền tảng SaaS thế hệ mới.
Bạn sẽ chịu trách nhiệm thiết kế kiến trúc hệ thống, xây dựng các tính năng cốt lõi và tối ưu hóa hiệu năng trải nghiệm người dùng từ Frontend Next.js đến Backend microservices.`,
    requirements: `- Tối thiểu 4 năm kinh nghiệm với React, TypeScript, Next.js và Node.js/NestJS.
- Thành thạo kiến trúc RESTful API, PostgreSQL, Redis và ORM (Prisma/TypeORM).
- Tư duy thiết kế hệ thống tốt, quen thuộc với Docker và CI/CD pipelines.`,
  },
  {
    title: "Senior Backend Engineer (NestJS / PostgreSQL)",
    department: "Engineering",
    location: "Remote / Global",
    workplace: "Remote",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$2,800 - $4,500 / month",
    experienceLevel: "Senior",
    description: `Tham gia đội ngũ kỹ thuật xây dựng hệ thống xử lý dữ liệu quy mô lớn với độ trễ thấp và bảo mật cao.
Bạn sẽ trực tiếp thiết kế cơ sở dữ liệu, quản lý kết nối MinIO lưu trữ tài liệu và triển khai Event-Driven Architecture.`,
    requirements: `- 4+ năm kinh nghiệm Backend với Node.js, NestJS và TypeScript.
- Chuyên sâu về tối ưu truy vấn PostgreSQL, indexing và caching.
- Có kinh nghiệm với SSE (Server-Sent Events), WebSockets và message queues.`,
  },
  {
    title: "Lead Frontend Architect (Next.js & Performance)",
    department: "Engineering",
    location: "Ho Chi Minh City, Vietnam",
    workplace: "Hybrid",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$3,000 - $4,800 / month",
    experienceLevel: "Lead",
    description: `Dẫn dắt kiến trúc giao diện người dùng, định hình Design System và nâng cao tiêu chuẩn trải nghiệm Web Interface Guidelines.
Đảm bảo hiệu suất Core Web Vitals tối đa trên cả thiết bị di động và máy tính để bàn.`,
    requirements: `- 5+ năm phát triển Frontend hiện đại với React 19, Next.js App Router, Tailwind CSS v4.
- Am hiểu sâu sắc về Performance Profiling, Bundle Size Optimization và Micro-frontends.
- Khả năng mentoring và dẫn dắt đội ngũ kỹ sư Frontend.`,
  },
  {
    title: "Senior Product Designer (UI/UX & Design System)",
    department: "Design",
    location: "Da Nang, Vietnam",
    workplace: "Remote",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$2,000 - $3,200 / month",
    experienceLevel: "Senior",
    description: `Chịu trách nhiệm toàn diện về trải nghiệm người dùng, từ nghiên cứu người dùng (User Research), vẽ Wireframes đến hoàn thiện Prototype có độ trung thực cao trên Figma.`,
    requirements: `- 4+ năm kinh nghiệm thiết kế UI/UX cho các sản phẩm B2B SaaS hoặc Nền tảng Doanh nghiệp.
- Thành thạo Figma, Design Tokens và xây dựng Design System quy mô lớn.
- Tư duy sản phẩm sắc bén và khả năng tương tác chặt chẽ với Kỹ sư phần mềm.`,
  },
  {
    title: "Senior Product Manager (B2B SaaS)",
    department: "Product",
    location: "Hanoi, Vietnam",
    workplace: "On-site",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$2,500 - $3,800 / month",
    experienceLevel: "Senior",
    description: `Định hướng tầm nhìn sản phẩm, xác định Product Roadmap và dẫn dắt quy trình phát triển sản phẩm theo phương pháp Agile/Scrum.`,
    requirements: `- 3+ năm làm Product Manager cho các sản phẩm công nghệ B2B / SaaS.
- Khả năng phân tích dữ liệu định lượng và định tính xuất sắc.
- Kỹ năng giao tiếp và thuyết phục các bên liên quan (Stakeholders).`,
  },
  {
    title: "DevOps & Cloud Infrastructure Engineer",
    department: "DevOps",
    location: "Remote",
    workplace: "Remote",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$2,400 - $3,900 / month",
    experienceLevel: "Mid-Senior",
    description: `Quản lý hạ tầng đám mây AWS, triển khai hệ thống containerization với Docker/Kubernetes và đảm bảo Uptime hệ thống đạt 99.99%.`,
    requirements: `- 3+ năm kinh nghiệm quản trị hạ tầng Linux, AWS / GCP.
- Thành thạo Terraform, Docker, Kubernetes và GitHub Actions / GitLab CI.
- Kinh nghiệm giám sát hệ thống với Prometheus, Grafana và Datadog.`,
  },
  {
    title: "QA Automation Engineer (Playwright / Vitest)",
    department: "Quality Assurance",
    location: "Hanoi, Vietnam",
    workplace: "Hybrid",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$1,500 - $2,500 / month",
    experienceLevel: "Mid-Senior",
    description: `Xây dựng khung kiểm thử tự động (Automation Test Framework) cho cả API và End-to-End UI, tích hợp tự động vào quy trình CI/CD.`,
    requirements: `- 2+ năm kinh nghiệm viết E2E test với Playwright, Cypress hoặc Selenium.
- Thành thạo TypeScript, kiểm thử API với Vitest/Jest và Postman.
- Tư duy kiểm thử chặt chẽ, chú trọng trải nghiệm người dùng cuối.`,
  },
  {
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Ho Chi Minh City, Vietnam",
    workplace: "Hybrid",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$1,600 - $2,600 / month",
    experienceLevel: "Lead",
    description: `Lên kế hoạch và thực thi chiến lược tăng trưởng người dùng B2B, tối ưu hóa phễu chuyển đổi (Conversion Funnel) và quản lý các kênh truyền thông số.`,
    requirements: `- 3+ năm kinh nghiệm Growth Marketing trong lĩnh vực Tech / SaaS.
- Nắm vững Google Analytics, SEO, SEM, LinkedIn Ads và Content Marketing.
- Tư duy hướng dữ liệu (Data-driven mindset).`,
  },
  {
    title: "Senior Technical Recruiter (HR)",
    department: "Human Resources",
    location: "Hanoi, Vietnam",
    workplace: "On-site",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryRange: "$1,400 - $2,200 / month",
    experienceLevel: "Senior",
    description: `Trực tiếp săn tìm và thu hút nhân tài công nghệ hàng đầu (Headhunting), quản lý quy trình phỏng vấn và nâng cao trải nghiệm ứng viên.`,
    requirements: `- 3+ năm kinh nghiệm tuyển dụng vị trí kỹ thuật IT (Software Engineers, PM, Designers).
- Mạng lưới ứng viên IT rộng rãi và khả năng kết nối tốt qua LinkedIn, GitHub.
- Kỹ năng đàm phán chế độ đãi ngộ và văn hóa tuyển dụng minh bạch.`,
  },
  {
    title: "Enterprise Account Executive (SaaS Sales)",
    department: "Sales",
    location: "Singapore / Remote",
    workplace: "Remote",
    type: "CONTRACT",
    status: "PUBLISHED",
    salaryRange: "$3,500 - $5,500 + OTE",
    experienceLevel: "Senior",
    description: `Mở rộng thị trường doanh nghiệp tại khu vực Đông Nam Á, đàm phán hợp đồng lớn và xây dựng mối quan hệ đối tác chiến lược lâu dài.`,
    requirements: `- 4+ năm kinh nghiệm bán hàng phần mềm doanh nghiệp (B2B SaaS / Enterprise Software).
- Thành tích vượt KPI doanh số đã được chứng minh.
- Tiếng Anh lưu loát, ưu tiên ứng viên có kinh nghiệm thị trường Singapore/SEA.`,
  },
];

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;

function generateCandidateName(index: number): { name: string; email: string; phone: string } {
  const isVietnamese = index % 3 !== 0; // 67% Vietnamese, 33% International

  let name = "";
  if (isVietnamese) {
    const fn = VIETNAMESE_FIRST_NAMES[index % VIETNAMESE_FIRST_NAMES.length];
    const mn = VIETNAMESE_MIDDLE_NAMES[(index * 3) % VIETNAMESE_MIDDLE_NAMES.length];
    const ln = VIETNAMESE_LAST_NAMES[(index * 7) % VIETNAMESE_LAST_NAMES.length];
    name = `${fn} ${mn} ${ln}`;
  } else {
    const fn = INTL_FIRST_NAMES[index % INTL_FIRST_NAMES.length];
    const ln = INTL_LAST_NAMES[(index * 3) % INTL_LAST_NAMES.length];
    name = `${fn} ${ln}`;
  }

  // Create clean email slug
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".");
  const email = `${normalized}.${index + 10}@example.com`;
  const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

  return { name, email, phone };
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

  await db.orm.public.Application.all().then((apps) =>
    Promise.all(apps.map((a) => db.orm.public.Application.where((x) => x.id.eq(a.id)).delete())),
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
  console.log("💼 3. Seeding 10 Job Positions for Admin Org...");
  console.log("==================================================");

  const createdJobIds: string[] = [];

  for (let i = 0; i < JOB_TEMPLATES.length; i++) {
    const template = JOB_TEMPLATES[i];
    const jobId = crypto.randomUUID();

    await db.orm.public.Job.upsert({
      create: {
        id: jobId,
        title: template.title,
        department: template.department,
        location: template.location,
        workplace: template.workplace,
        type: template.type,
        experienceLevel: template.experienceLevel,
        salaryRange: template.salaryRange,
        description: template.description,
        requirements: template.requirements,
        status: template.status,
        organizationId: adminOrgId,
        createdById: adminUserId,
      },
      update: {},
      conflictOn: { id: jobId },
    });

    createdJobIds.push(jobId);
    console.log(`  [Job ${i + 1}/10] ${template.title} (${template.department})`);
  }

  console.log("==================================================");
  console.log("👥 4. Seeding 200 Candidates across 6 Stages...");
  console.log("==================================================");

  let candidateIndex = 0;
  const stageStats: Record<string, number> = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
  };

  // Distribution per job (20 candidates per job x 10 jobs = 200 total)
  // APPLIED: 6, SCREENING: 4, INTERVIEW: 4, OFFER: 2, HIRED: 2, REJECTED: 2 = 20
  const stagePattern: (typeof STAGES)[number][] = [
    "APPLIED", "APPLIED", "APPLIED", "APPLIED", "APPLIED", "APPLIED",
    "SCREENING", "SCREENING", "SCREENING", "SCREENING",
    "INTERVIEW", "INTERVIEW", "INTERVIEW", "INTERVIEW",
    "OFFER", "OFFER",
    "HIRED", "HIRED",
    "REJECTED", "REJECTED",
  ];

  for (let j = 0; j < createdJobIds.length; j++) {
    const jobId = createdJobIds[j];

    for (let s = 0; s < stagePattern.length; s++) {
      candidateIndex++;
      const stage = stagePattern[s];
      stageStats[stage]++;

      const { name, email, phone } = generateCandidateName(candidateIndex);
      const appId = crypto.randomUUID();

      // Custom metadata & notes
      let notes = "";
      if (stage === "INTERVIEW") {
        const interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + (candidateIndex % 7) + 1);
        const dateStr = interviewDate.toISOString().split("T")[0];
        const times = ["09:00", "10:30", "14:00", "15:30", "16:45"];
        const timeStr = times[candidateIndex % times.length];
        const types = ["Kỹ thuật (Technical)", "Văn hóa (Culture fit)", "Phỏng vấn Sơ bộ", "Vòng cuối với Ban Lãnh đạo"];
        const formats = ["MEET", "ZOOM", "TEAMS", "OFFICE"] as const;
        const format = formats[candidateIndex % formats.length];
        const interviewers = ["Nguyễn Văn A (Engineering Lead)", "Sarah Jenkins (VP Product)", "Trần Minh Đức (CTO)", "Phạm Thu Hương (HR Director)"];

        const interviewData = {
          date: dateStr,
          time: timeStr,
          type: types[candidateIndex % types.length],
          format,
          linkOrLocation: format === "OFFICE" ? "Tầng 5, Tòa nhà Keangnam, Hà Nội" : "https://meet.google.com/ats-demo-room",
          interviewer: interviewers[candidateIndex % interviewers.length],
          notes: "Ứng viên có kiến thức chuyên môn vững vàng. Cần chuẩn bị bài tập thực hành.",
        };
        notes = `Interview: ${JSON.stringify(interviewData)} | Score: ${80 + (candidateIndex % 18)}%`;
      } else if (stage === "OFFER" || stage === "HIRED") {
        notes = `Đánh giá xuất sắc vòng phỏng vấn chuyên môn. Match Score: ${90 + (candidateIndex % 9)}% | Mức lương đề xuất phù hợp ngân sách.`;
      } else if (stage === "REJECTED") {
        notes = `Hồ sơ chưa đạt tiêu chuẩn kinh nghiệm tối thiểu yêu cầu hoặc kỳ vọng mức lương vượt khung ngân sách.`;
      } else {
        notes = `Hồ sơ nộp trực tuyến qua Cổng tuyển dụng ATS. Match Score: ${70 + (candidateIndex % 25)}%`;
      }

      const fileName = `CV_${name.replace(/\s+/g, "_")}.pdf`;

      await db.orm.public.Application.upsert({
        create: {
          id: appId,
          jobId,
          candidateName: name,
          candidateEmail: email,
          candidatePhone: phone,
          stage,
          resumeUrl: `/ats-resumes/${fileName}`,
          resumeFileName: fileName,
          resumeFileSize: Math.floor(500000 + Math.random() * 1500000), // 500KB - 2MB
          resumeMimeType: "application/pdf",
          notes,
          orderIndex: s,
        },
        update: {},
        conflictOn: { id: appId },
      });
    }
  }

  console.log(`\n✅ Thành công! Đã gieo mầm ${candidateIndex} ứng viên:`);
  console.log(`   - APPLIED:    ${stageStats.APPLIED} ứng viên`);
  console.log(`   - SCREENING:  ${stageStats.SCREENING} ứng viên`);
  console.log(`   - INTERVIEW:  ${stageStats.INTERVIEW} ứng viên (kèm lịch hẹn trong Interview Hub)`);
  console.log(`   - OFFER:      ${stageStats.OFFER} ứng viên`);
  console.log(`   - HIRED:      ${stageStats.HIRED} ứng viên`);
  console.log(`   - REJECTED:   ${stageStats.REJECTED} ứng viên`);
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
