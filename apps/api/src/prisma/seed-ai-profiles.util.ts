import type {
  JobApplicationFormConfig,
  JobScoringConfig,
  ScreeningAnswerItem,
  ScreeningQuestion,
} from "@haihire/shared";
import type {
  CandidateCvTemplateInput,
  SeedCvExperienceEntry,
  SeedCvProjectEntry,
} from "./seed-cv-pdf.util.ts";

export interface SeedJobBlueprintTemplates {
  applicationFormConfig: JobApplicationFormConfig;
  scoringConfig: JobScoringConfig;
}

export type AiTestScenarioKind =
  | "strong"
  | "good"
  | "junior"
  | "mismatch"
  | "no_cv"
  | "scanned"
  | "truncated"
  | "prompt_injection";

interface DomainCvProfile {
  skills: string[];
  experiences: SeedCvExperienceEntry[];
  projects: SeedCvProjectEntry[];
  certifications: string[];
  education: string;
}

/**
 * Generates domain-specific Application Form questions and AI Scoring Criteria for each of the 20 base roles.
 * Intentionally leaves role indices 6 (QA Automation) and 7 (Growth Marketing) without scoring criteria
 * so users can test "Generate criteria with AI" and balanced fallback scoring.
 */
export function buildJobBlueprintTemplates(
  roleIndex: number,
  roleTitle: string,
  department: string,
): SeedJobBlueprintTemplates {
  const normalizedIdx = ((roleIndex % 20) + 20) % 20;
  const formConfig = buildApplicationFormForRole(
    normalizedIdx,
    roleTitle,
    department,
  );
  const scoringConfig = buildScoringConfigForRole(
    normalizedIdx,
    roleTitle,
    department,
  );
  return {
    applicationFormConfig: formConfig,
    scoringConfig,
  };
}

function buildApplicationFormForRole(
  idx: number,
  roleTitle: string,
  department: string,
): JobApplicationFormConfig {
  const sharedMode = idx === 0 || idx === 1 ? "optional" : "required";

  const roleQuestionsMap: Record<number, ScreeningQuestion[]> = {
    0: [
      {
        id: "fs-years",
        text: "Số năm kinh nghiệm sản xuất với React, TypeScript và Node.js/NestJS?",
        type: "number",
        required: true,
      },
      {
        id: "fs-stack",
        text: "Những công nghệ nào bạn đã trực tiếp vận hành ở môi trường Production?",
        type: "multiple_choice",
        required: true,
        options: [
          "React / Next.js App Router",
          "NestJS / Express TypeScript",
          "PostgreSQL & Prisma / TypeORM",
          "Redis & Message Queues (BullMQ)",
          "Docker & CI/CD Pipelines",
        ],
      },
      {
        id: "fs-arch",
        text: "Mô tả một bài toán tối ưu hiệu năng Frontend hoặc Backend API mà bạn từng giải quyết (kèm số liệu đo lường nếu có).",
        type: "long_text",
        required: true,
      },
      {
        id: "fs-notice",
        text: "Thời gian sẵn sàng nhận việc nếu trúng tuyển?",
        type: "single_choice",
        required: true,
        options: ["Nhận việc ngay", "Sau 15 ngày", "Sau 30 ngày", "Thỏa thuận"],
      },
      {
        id: "fs-hybrid",
        text: "Bạn có sẵn sàng tham gia làm việc Hybrid cùng team tại văn phòng 2-3 ngày/tuần không?",
        type: "yes_no",
        required: false,
      },
    ],
    1: [
      {
        id: "be-years",
        text: "Số năm kinh nghiệm chuyên sâu với Node.js / NestJS và PostgreSQL?",
        type: "number",
        required: true,
      },
      {
        id: "be-patterns",
        text: "Những mẫu thiết kế & hạ tầng Backend nào bạn đã triển khai thực tế?",
        type: "multiple_choice",
        required: true,
        options: [
          "PostgreSQL Indexing & Query Tuning",
          "Row-Level Security / Multi-tenancy",
          "BullMQ / Kafka Background Queues",
          "Server-Sent Events (SSE) / WebSockets",
          "MinIO / AWS S3 Object Storage",
        ],
      },
      {
        id: "be-scale",
        text: "Chia sẻ kinh nghiệm thiết kế database migration không downtime hoặc xử lý queue retry / dead-letter.",
        type: "long_text",
        required: true,
      },
      {
        id: "be-english",
        text: "Mức độ tự tin đọc tài liệu kiến trúc và viết RFC bằng tiếng Anh?",
        type: "single_choice",
        required: true,
        options: ["Thành thạo hoàn toàn", "Đọc viết kỹ thuật tốt", "Cơ bản"],
      },
    ],
    2: [
      {
        id: "fe-years",
        text: "Số năm kinh nghiệm xây dựng Design System và tối ưu Core Web Vitals?",
        type: "number",
        required: true,
      },
      {
        id: "fe-stack",
        text: "Các kỹ thuật tối ưu Frontend bạn đã áp dụng thành công?",
        type: "multiple_choice",
        required: true,
        options: [
          "Next.js App Router & Streaming SSR",
          "Core Web Vitals (LCP/INP/CLS)",
          "Bundle Splitting & Tree Shaking",
          "WCAG Accessibility (a11y)",
          "React Profiling & Memoization",
        ],
      },
      {
        id: "fe-case",
        text: "Nêu ví dụ cụ thể bạn đã giảm bundle size hoặc cải thiện LCP cho một ứng dụng thực tế.",
        type: "long_text",
        required: true,
      },
    ],
    3: [
      {
        id: "pd-portfolio",
        text: "Đường dẫn Portfolio / Figma Case Studies của bạn",
        type: "url",
        required: false,
      },
      {
        id: "pd-years",
        text: "Số năm kinh nghiệm thiết kế sản phẩm B2B SaaS / Enterprise?",
        type: "number",
        required: true,
      },
      {
        id: "pd-methods",
        text: "Phương pháp nghiên cứu & xây dựng Design System bạn thường áp dụng?",
        type: "multiple_choice",
        required: true,
        options: [
          "User Interviews & Usability Testing",
          "Design Tokens (Color/Spacing/Type)",
          "Figma Auto-Layout & Variants",
          "Developer Handoff Specs",
        ],
      },
      {
        id: "pd-impact",
        text: "Mô tả 1 case study thiết kế lại luồng phức tạp giúp cải thiện tỷ lệ hoàn thành tác vụ hoặc mức độ hài lòng người dùng.",
        type: "long_text",
        required: true,
      },
    ],
  };

  if (roleQuestionsMap[idx]) {
    return {
      phone: "optional",
      resume: sharedMode,
      coverLetter: "optional",
      screeningQuestions: roleQuestionsMap[idx],
    };
  }

  return {
    phone: "optional",
    resume: "optional",
    coverLetter: "optional",
    screeningQuestions: [
      {
        id: `q-${idx}-years`,
        text: `Số năm kinh nghiệm trực tiếp ở vị trí ${roleTitle}?`,
        type: "number",
        required: true,
      },
      {
        id: `q-${idx}-domain`,
        text: `Bạn đã có kinh nghiệm làm việc trong phòng ban ${department} tại môi trường công nghệ / SaaS chưa?`,
        type: "yes_no",
        required: true,
      },
      {
        id: `q-${idx}-highlight`,
        text: `Thành tựu nổi bật nhất của bạn liên quan đến ${roleTitle} là gì?`,
        type: "long_text",
        required: true,
      },
      {
        id: `q-${idx}-workmode`,
        text: "Hình thức làm việc bạn ưu tiên?",
        type: "single_choice",
        required: false,
        options: ["Onsite", "Hybrid", "Remote"],
      },
    ],
  };
}

function buildScoringConfigForRole(
  idx: number,
  roleTitle: string,
  department: string,
): JobScoringConfig {
  // Intentionally leave QA Automation (6) and Growth Marketing (7) empty
  // so the user can test "Generate criteria with AI" & default fallback rubric.
  if (idx === 6 || idx === 7) {
    return { criteria: [], autoScore: false };
  }

  if (idx === 0) {
    return {
      autoScore: false,
      criteria: [
        {
          id: "crit-fs-frontend",
          key: "frontend_nextjs",
          title: "React, TypeScript & Next.js Mastery",
          category: "Technical",
          description:
            "Production mastery building modular UI architectures with React, TypeScript, Next.js App Router, and measurable frontend performance optimizations.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-fs-backend",
          key: "backend_nestjs_db",
          title: "Node.js / NestJS & PostgreSQL Architecture",
          category: "Technical",
          description:
            "Hands-on design of RESTful APIs, relational schemas in PostgreSQL (Prisma/TypeORM), Redis caching, and asynchronous queues.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-fs-system",
          key: "system_devops_impact",
          title: "System Design, DevOps & Business Impact",
          category: "Experience",
          description:
            "4+ years shipping end-to-end B2B SaaS products with Docker, CI/CD automation, and quantified latency or reliability improvements.",
          weight: 25,
          maxScore: 10,
        },
        {
          id: "crit-fs-collab",
          key: "screening_ownership",
          title: "Screening Clarity & Cross-Functional Ownership",
          category: "Soft Skills",
          description:
            "Clear communication in cover letter and screening answers, technical mentoring experience, and proactive stakeholder alignment.",
          weight: 15,
          maxScore: 10,
        },
      ],
    };
  }

  if (idx === 1) {
    return {
      autoScore: false,
      criteria: [
        {
          id: "crit-be-nestjs",
          key: "nestjs_typescript",
          title: "Node.js, NestJS & TypeScript Depth",
          category: "Technical",
          description:
            "4+ years designing clean NestJS services, DTO validation pipelines, modular domain architecture, and type-safe APIs.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-be-postgres",
          key: "postgresql_optimization",
          title: "PostgreSQL Design, Indexing & Multi-Tenancy",
          category: "Technical",
          description:
            "Deep proficiency in relational modeling, slow-query indexing, zero-downtime migrations, caching, and tenant data isolation.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-be-async",
          key: "event_driven_storage",
          title: "Event-Driven Queues, SSE & Object Storage",
          category: "Technical",
          description:
            "Production track record with BullMQ/Redis workers, SSE/WebSockets real-time updates, and MinIO/S3 secure document handling.",
          weight: 20,
          maxScore: 10,
        },
        {
          id: "crit-be-exp",
          key: "scale_ownership_comm",
          title: "Production Scale Impact & Screening Quality",
          category: "Experience",
          description:
            "Quantified production uptime/latency results, clear answers to backend screening questions, and technical documentation habits.",
          weight: 20,
          maxScore: 10,
        },
      ],
    };
  }

  if (idx === 2) {
    return {
      autoScore: false,
      criteria: [
        {
          id: "crit-fe-arch",
          key: "modern_react_nextjs",
          title: "React 19, Next.js App Router & Tailwind CSS",
          category: "Technical",
          description:
            "5+ years architecting complex multi-route web applications using modern React server/client patterns and design tokens.",
          weight: 35,
          maxScore: 10,
        },
        {
          id: "crit-fe-perf",
          key: "performance_cwv",
          title: "Core Web Vitals & Bundle Optimization",
          category: "Technical",
          description:
            "Proven impact profiling rendering bottlenecks, cutting JS bundle sizes, and improving LCP/INP metrics.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-fe-lead",
          key: "design_system_mentoring",
          title: "Design System Leadership & Mentoring",
          category: "Experience",
          description:
            "Experience owning UI component libraries, enforcing Web Accessibility, and coaching frontend engineers.",
          weight: 20,
          maxScore: 10,
        },
        {
          id: "crit-fe-comm",
          key: "communication_clarity",
          title: "Technical Communication & Screening Fit",
          category: "Soft Skills",
          description:
            "Articulate screening answers backed by concrete frontend case studies.",
          weight: 15,
          maxScore: 10,
        },
      ],
    };
  }

  if (idx === 3) {
    return {
      autoScore: false,
      criteria: [
        {
          id: "crit-pd-portfolio",
          key: "portfolio_impact",
          title: "B2B SaaS Portfolio & Measurable Outcomes",
          category: "Experience",
          description:
            "4+ years of polished end-to-end B2B product case studies showing problem framing and business metric gains.",
          weight: 35,
          maxScore: 10,
        },
        {
          id: "crit-pd-craft",
          key: "figma_design_system",
          title: "Figma Craft, Design Tokens & UI Architecture",
          category: "Technical",
          description:
            "Deep fluency building scalable Figma component libraries, tokens, and accessible data-dense enterprise workflows.",
          weight: 30,
          maxScore: 10,
        },
        {
          id: "crit-pd-research",
          key: "research_discovery",
          title: "User Research, Discovery & Usability Testing",
          category: "Soft Skills",
          description:
            "Structured discovery interviews, prototyping validation loops, and data-informed iteration.",
          weight: 20,
          maxScore: 10,
        },
        {
          id: "crit-pd-handoff",
          key: "engineering_collaboration",
          title: "Cross-Functional Handoff & Product Thinking",
          category: "Soft Skills",
          description:
            "Strong partnership with PMs and engineers from wireframe specs through QA review.",
          weight: 15,
          maxScore: 10,
        },
      ],
    };
  }

  return {
    autoScore: false,
    criteria: [
      {
        id: `crit-${idx}-core`,
        key: "core_domain_expertise",
        title: `Core ${roleTitle} Expertise`,
        category: "Technical",
        description: `Verified hands-on mastery of tools, methodologies, and technical deliverables required for ${roleTitle}.`,
        weight: 35,
        maxScore: 10,
      },
      {
        id: `crit-${idx}-exp`,
        key: "relevant_experience_impact",
        title: `Relevant ${department} Experience & Outcomes`,
        category: "Experience",
        description: `Consistent track record owning initiatives in ${department} with concrete metrics, scale, or KPI improvements.`,
        weight: 30,
        maxScore: 10,
      },
      {
        id: `crit-${idx}-screening`,
        key: "screening_depth",
        title: "Screening Responses & Role Motivation",
        category: "Soft Skills",
        description:
          "Completeness, specificity, and honesty across screening answers and cover letter.",
        weight: 20,
        maxScore: 10,
      },
      {
        id: `crit-${idx}-collab`,
        key: "cross_team_communication",
        title: "Collaboration & Execution Reliability",
        category: "Soft Skills",
        description:
          "Evidence of cross-functional teamwork, stakeholder communication, and structured problem solving.",
        weight: 15,
        maxScore: 10,
      },
    ],
  };
}

function getDomainCvProfile(
  roleIndex: number,
  tier: "strong" | "good" | "junior",
): DomainCvProfile {
  const idx = ((roleIndex % 20) + 20) % 20;

  if (idx === 0 || idx === 1 || idx === 2) {
    if (tier === "strong") {
      return {
        skills: [
          "TypeScript",
          "NestJS",
          "React 19",
          "Next.js App Router",
          "PostgreSQL (Indexing, RLS)",
          "Prisma ORM",
          "Redis & BullMQ",
          "MinIO / S3",
          "Server-Sent Events (SSE)",
          "Docker & GitHub Actions",
        ],
        experiences: [
          {
            role: "Senior Full-Stack & Backend Engineer",
            company: "FinStack Enterprise Cloud",
            period: "2022 - Present",
            bullets: [
              "Architected multi-tenant NestJS microservices and PostgreSQL RLS schemas serving 480 enterprise organizations at 99.98% uptime.",
              "Built async BullMQ + Redis job workers for AI scoring and MinIO PDF pipelines, reducing API P95 response latency by 42% (from 680ms to 390ms).",
              "Led Next.js App Router + React Query UI architecture, implementing real-time SSE workspace sync and cutting initial JS bundle by 34%.",
            ],
          },
          {
            role: "Software Engineer (TypeScript / Node.js)",
            company: "VietPay Digital Platform",
            period: "2019 - 2022",
            bullets: [
              "Designed zero-downtime PostgreSQL migrations and composite B-tree indexes over 45M+ transaction records.",
              "Automated Docker container builds and Vitest/Playwright CI gates achieving 88% critical path test coverage.",
            ],
          },
        ],
        projects: [
          {
            name: "Multi-Tenant Enterprise ATS & Async AI Pipeline",
            details:
              "Delivered tenant-isolated S3/MinIO document storage, transactional outbox notifications, and structured JSON LLM scoring pipelines handling 12,000+ resumes/month.",
          },
        ],
        certifications: [
          "AWS Certified Developer - Associate",
          "PostgreSQL Performance Tuning Workshop Certificate",
        ],
        education:
          "B.Eng. in Computer Science (Honors) - Ho Chi Minh City University of Technology (2015 - 2019)",
      };
    }

    if (tier === "good") {
      return {
        skills: [
          "TypeScript",
          "React",
          "Next.js",
          "Node.js",
          "NestJS",
          "PostgreSQL",
          "Prisma",
          "Docker",
        ],
        experiences: [
          {
            role: "Backend & Full-Stack Developer",
            company: "SaigonSoft Commerce",
            period: "2022 - Present",
            bullets: [
              "Built NestJS REST APIs and Prisma data models for order processing and internal admin dashboards (30,000 daily active users).",
              "Optimized slow PostgreSQL reporting queries and added unit/integration tests with Vitest.",
            ],
          },
          {
            role: "Frontend Developer (React / TypeScript)",
            company: "TikiHub Tech Studio",
            period: "2020 - 2022",
            bullets: [
              "Developed reusable React form flows and Tailwind CSS components in collaboration with product designers.",
            ],
          },
        ],
        projects: [
          {
            name: "B2B HR Onboarding Portal",
            details:
              "Implemented candidate portal forms, REST endpoints, and PDF upload workflows backed by PostgreSQL.",
          },
        ],
        certifications: ["Meta Front-End Developer Certificate"],
        education:
          "B.Sc. in Software Engineering - University of Information Technology (VNU-HCM, 2016 - 2020)",
      };
    }

    return {
      skills: [
        "JavaScript",
        "TypeScript (Basic)",
        "React",
        "Express.js",
        "PostgreSQL (CRUD)",
      ],
      experiences: [
        {
          role: "Junior Web Developer",
          company: "DeltaWeb Agency",
          period: "2025 - Present",
          bullets: [
            "Maintained React admin pages and basic Express API endpoints for small client websites.",
            "Wrote basic SQL queries and fixed UI responsiveness bugs reported by QA.",
          ],
        },
      ],
      projects: [
        {
          name: "Task Tracker Capstone App",
          details:
            "Built a CRUD task management app using React and PostgreSQL during university graduation.",
        },
      ],
      certifications: [],
      education:
        "B.Sc. in Information Technology - Thang Long University (2021 - 2025)",
    };
  }

  if (idx === 3 || idx === 17) {
    return {
      skills:
        tier === "strong"
          ? [
              "Figma (Auto-Layout, Variables, Tokens)",
              "B2B SaaS Design Systems",
              "User Research & Usability Testing",
              "Interactive Prototyping",
              "WCAG 2.1 Accessibility",
              "Design-Dev Handoff",
            ]
          : ["Figma", "Wireframing", "UI Components", "Basic Prototyping"],
      experiences: [
        {
          role:
            tier === "strong" ? "Senior Product Designer" : "Product Designer",
          company: "KovaSaaS Product Labs",
          period: tier === "strong" ? "2021 - Present" : "2024 - Present",
          bullets:
            tier === "strong"
              ? [
                  "Owned the enterprise B2B Design System across 65+ screens, reducing engineering UI QA cycles by 38%.",
                  "Conducted 40+ moderated usability sessions and redesigned onboarding, raising activation completion by 29%.",
                ]
              : [
                  "Created wireframes and Figma UI mockups for internal dashboards and mobile screens.",
                ],
        },
      ],
      projects: [
        {
          name: "Enterprise Recruiting Workflow Redesign",
          details:
            "Redesigned Kanban pipeline and candidate evaluation drawers with structured design tokens.",
        },
      ],
      certifications:
        tier === "strong" ? ["Google UX Design Professional Certificate"] : [],
      education:
        "B.A. in Interactive Digital Design - FPT University (2016 - 2020)",
    };
  }

  // Generic tailored role CV profile across remaining roles (PM, DevOps, QA, Marketing, HR, Sales, AI, Data, SecOps, etc.)
  const roleTitleHint: Record<number, string[]> = {
    4: [
      "Product Strategy",
      "Roadmapping",
      "SQL Analytics",
      "Agile/Scrum",
      "B2B SaaS Discovery",
    ],
    5: [
      "AWS",
      "Terraform",
      "Docker",
      "Kubernetes",
      "GitHub Actions",
      "Prometheus",
      "Grafana",
    ],
    6: [
      "Playwright",
      "Vitest",
      "TypeScript",
      "API Contract Testing",
      "CI/CD Gates",
    ],
    7: [
      "SEO / SEM",
      "LinkedIn Ads",
      "HubSpot",
      "Google Analytics 4",
      "Conversion Funnel",
    ],
    8: [
      "Tech Headhunting",
      "Boolean Search",
      "LinkedIn Recruiter",
      "Stakeholder Intake",
      "Offer Negotiation",
    ],
    9: [
      "Enterprise B2B Sales",
      "MEDDIC",
      "SaaS Demos",
      "Contract Negotiation",
      "SEA Accounts",
    ],
    10: [
      "Python",
      "TypeScript",
      "LLM Evaluation",
      "RAG Pipelines",
      "pgvector",
      "Prompt Engineering",
    ],
    11: [
      "React Native",
      "TypeScript",
      "iOS Swift",
      "Android Kotlin",
      "Offline Sync",
    ],
    12: [
      "ClickHouse",
      "Apache Kafka",
      "dbt",
      "Airflow",
      "Star Schema ETL",
      "SQL",
    ],
    13: [
      "ISO 27001",
      "SOC 2",
      "OWASP ASVS",
      "Penetration Testing",
      "SIEM Alerting",
    ],
    14: [
      "Enterprise Onboarding",
      "QBR Reviews",
      "Net Revenue Retention",
      "SaaS Implementation",
    ],
    15: [
      "OpenAPI Docs",
      "Technical Blogs",
      "Architecture Guides",
      "SEO Documentation",
    ],
    16: [
      "Engineering Management",
      "System Architecture",
      "OKRs & 1-on-1s",
      "Hiring & Mentoring",
    ],
    18: [
      "Full-Cycle Recruiting",
      "Interview Coordination",
      "Employer Branding",
      "Candidate Experience",
    ],
    19: [
      "Cloud Architecture",
      "SAML / OIDC SSO",
      "Enterprise Integrations",
      "Webhook Security",
    ],
  };

  const domainSkills = roleTitleHint[idx] ?? [
    "Problem Solving",
    "Agile Collaboration",
    "Technical Execution",
  ];
  return {
    skills: domainSkills,
    experiences: [
      {
        role:
          tier === "strong"
            ? "Senior Specialist"
            : tier === "good"
              ? "Specialist"
              : "Associate",
        company: "Aurelia Tech Vietnam",
        period:
          tier === "strong"
            ? "2021 - Present"
            : tier === "good"
              ? "2023 - Present"
              : "2025 - Present",
        bullets:
          tier === "strong"
            ? [
                `Delivered core ${domainSkills.slice(0, 3).join(", ")} initiatives across B2B SaaS teams with +32% measurable efficiency improvement.`,
                "Mentored peers, documented standard playbooks, and aligned quarterly KPIs with leadership.",
              ]
            : tier === "good"
              ? [
                  `Applied ${domainSkills.slice(0, 2).join(" & ")} in production team projects with consistent delivery.`,
                ]
              : [
                  `Supported day-to-day operations and assisted senior team members on ${domainSkills[0] ?? "team"} tasks.`,
                ],
      },
    ],
    projects: [],
    certifications: [],
    education:
      "B.Sc. in Business & Technology - National Economics University (2017 - 2021)",
  };
}

function getWeakMismatchedProfile(): DomainCvProfile {
  return {
    skills: [
      "Cash Register POS Operation",
      "Retail Store Inventory Counting",
      "In-Store Merchandising",
      "Microsoft Word",
      "Customer Greeting",
    ],
    experiences: [
      {
        role: "Retail Store Shift Supervisor",
        company: "MiniMart Convenience Chain",
        period: "2022 - Present",
        bullets: [
          "Managed daily store opening/closing cash drawer reconciliation and shelf restocking schedules.",
          "Trained 4 part-time store cashiers on POS barcode scanning and store cleanliness checklists.",
          "Has zero software engineering, programming, TypeScript, React, NestJS, SQL, or SaaS experience.",
        ],
      },
    ],
    projects: [],
    certifications: ["Food Safety Handling Certificate (Retail)"],
    education: "Vocational Diploma in Retail Store Management (2020 - 2022)",
  };
}

/**
 * Maps Demo 1's first non-pinned candidates (indices 2..9) deterministically to comprehensive AI test scenarios
 * so the user immediately sees Strong, Good, Junior, Mismatch, NO_CV, Scanned, Truncated, and Prompt Injection cases.
 */
export function resolveAiTestScenarioForCandidate(
  orgIndex: number,
  candidateIdx: number,
): AiTestScenarioKind | null {
  if (orgIndex === 1) {
    if (candidateIdx === 0) return "strong"; // Minh Kanban Tran (Backend)
    if (candidateIdx === 1) return "good"; // Test Applicant Nguyen (Backend)
    const map: Record<number, AiTestScenarioKind> = {
      2: "strong", // Job #0 Full-Stack
      3: "good", // Job #0 Full-Stack
      4: "junior", // Job #0 Full-Stack
      5: "mismatch", // Job #0 Full-Stack
      6: "no_cv", // Job #1 Backend (NO_CV warning)
      7: "scanned", // Job #1 Backend (minimal text scanned PDF)
      8: "truncated", // Job #1 Backend (>12,000 chars truncated CV)
      9: "prompt_injection", // Job #1 Backend (prompt injection resistance)
    };
    return map[candidateIdx] ?? null;
  }
  return null;
}

/**
 * Builds rich PDF input tailored to the candidate's target role and AI test scenario.
 */
export function buildTailoredCvTemplateInput(params: {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  targetRole: string;
  primaryJobIndex: number;
  candidateIdx: number;
  scenario: AiTestScenarioKind | null;
}): CandidateCvTemplateInput {
  const tier: "strong" | "good" | "junior" =
    params.scenario === "strong" || params.scenario === "truncated"
      ? "strong"
      : params.scenario === "good" || params.scenario === "no_cv"
        ? "good"
        : params.scenario === "junior"
          ? "junior"
          : (["strong", "good", "junior"] as const)[params.candidateIdx % 3];

  if (params.scenario === "scanned") {
    return {
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      gender: params.gender,
      targetRole: params.targetRole,
      cvMode: "scanned_minimal",
    };
  }

  if (
    params.scenario === "mismatch" ||
    params.scenario === "prompt_injection"
  ) {
    const weak = getWeakMismatchedProfile();
    return {
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      gender: params.gender,
      targetRole: "Retail Store Operations Supervisor",
      experienceYears: 2,
      skills: weak.skills,
      experiences: weak.experiences,
      certifications: weak.certifications,
      education: weak.education,
      summary:
        "2 years of physical convenience store cash-handling and shelf stocking experience looking to switch careers without prior software engineering background.",
      cvMode:
        params.scenario === "prompt_injection" ? "prompt_injection" : "normal",
    };
  }

  const profile = getDomainCvProfile(params.primaryJobIndex, tier);
  const years = tier === "strong" ? 6 : tier === "good" ? 4 : 1;

  return {
    fullName: params.fullName,
    email: params.email,
    phone: params.phone,
    gender: params.gender,
    targetRole: params.targetRole,
    experienceYears: years,
    skills: profile.skills,
    experiences: profile.experiences,
    projects: profile.projects,
    certifications: profile.certifications,
    education: profile.education,
    cvMode: params.scenario === "truncated" ? "very_long" : "normal",
  };
}

/**
 * Generates realistic, role-specific Cover Letter & Screening Answers aligned with the Job's ApplicationFormConfig.
 */
export function buildApplicationFormSubmissionSeed(params: {
  candidateName: string;
  jobTitle: string;
  formConfig: JobApplicationFormConfig;
  scenario: AiTestScenarioKind | null;
  candidateIdx: number;
}): {
  coverLetter: string;
  screeningAnswers: ScreeningAnswerItem[];
} {
  const tier =
    params.scenario ??
    (["strong", "good", "junior"] as const)[params.candidateIdx % 3];

  let coverLetter: string;
  if (tier === "mismatch" || tier === "prompt_injection") {
    coverLetter = `Xin chào đội ngũ tuyển dụng,\nTôi hiện đang làm quản lý ca tại cửa hàng tiện lợi và chưa có kinh nghiệm làm ${params.jobTitle}, nhưng tôi muốn nộp hồ sơ thử sức sang mảng công nghệ.`;
  } else if (tier === "junior") {
    coverLetter = `Kính gửi anh/chị HR,\nTôi mới tốt nghiệp và có hơn 1 năm tham gia phát triển các tính năng cơ bản liên quan đến ${params.jobTitle}. Tôi rất mong có cơ hội học hỏi và đóng góp cho đội ngũ.`;
  } else if (tier === "no_cv") {
    coverLetter = `Kính gửi anh/chị phụ trách tuyển dụng ${params.jobTitle},\nTôi gặp sự cố khi tải tệp CV PDF lên nhưng xin tóm tắt kinh nghiệm: tôi có 5 năm làm việc chuyên sâu với NestJS, PostgreSQL (tối ưu query & indexing), Redis/BullMQ và MinIO cho hệ thống SaaS đa tenant, từng giảm độ trễ P95 xuống 40%. Rất mong được trao đổi chi tiết trong buổi phỏng vấn.`;
  } else {
    coverLetter = `Kính gửi đội ngũ tuyển dụng,\nVới kinh nghiệm trực tiếp dẫn dắt các hệ thống SaaS quy mô lớn phù hợp với vị trí ${params.jobTitle}, tôi đã trực tiếp tối ưu hiệu năng API giảm 42% độ trễ, triển khai CI/CD tự động hóa và phối hợp chặt chẽ cùng Product & QA. Tôi rất hào hứng đồng hành cùng công ty ở giai đoạn tăng trưởng tiếp theo.`;
  }

  const screeningAnswers: ScreeningAnswerItem[] =
    params.formConfig.screeningQuestions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      questionType: q.type,
      answer: pickRealisticScreeningAnswer(q, tier),
    }));

  return { coverLetter, screeningAnswers };
}

function pickRealisticScreeningAnswer(
  q: ScreeningQuestion,
  tier: AiTestScenarioKind | "strong" | "good" | "junior",
): ScreeningAnswerItem["answer"] {
  const isWeak = tier === "mismatch" || tier === "prompt_injection";
  const isStrong =
    tier === "strong" || tier === "truncated" || tier === "no_cv";
  const isGood = tier === "good" || tier === "scanned";

  switch (q.type) {
    case "number":
      return isWeak ? 0 : isStrong ? 6 : isGood ? 4 : 1;
    case "yes_no":
      return isWeak ? false : true;
    case "single_choice": {
      const opts = q.options ?? [];
      if (opts.length === 0) return "";
      if (isStrong) return opts[0];
      if (isWeak) return opts[opts.length - 1];
      return opts[Math.min(1, opts.length - 1)];
    }
    case "multiple_choice": {
      const opts = q.options ?? [];
      if (opts.length === 0) return [];
      if (isStrong) return opts;
      if (isGood) return opts.slice(0, Math.min(3, opts.length));
      if (tier === "junior") return opts.slice(0, 1);
      return [];
    }
    case "url":
      return isWeak
        ? "https://example.com/no-portfolio"
        : "https://github.com/haihire-demo/enterprise-portfolio";
    case "date":
      return "2026-12-01";
    case "long_text":
      if (isWeak) {
        return "Tôi chưa từng làm qua hệ thống phần mềm hay cơ sở dữ liệu trước đây, chủ yếu quản lý thu ngân tại cửa hàng.";
      }
      if (isStrong) {
        return "Tôi đã trực tiếp thiết kế kiến trúc multi-tenant với PostgreSQL Row-Level Security, tạo composite index giảm thời gian truy vấn từ 1.2s xuống 45ms, kết hợp BullMQ + Redis xử lý bất đồng bộ hàng chục nghìn tác vụ mỗi ngày với zero-downtime migration.";
      }
      if (isGood) {
        return "Tôi đã xây dựng REST API bằng NestJS kết hợp Prisma & PostgreSQL cho hệ thống 30.000 người dùng, tối ưu caching cơ bản và viết unit test Vitest cho các luồng nghiệp vụ chính.";
      }
      return "Tôi từng làm bài toán CRUD và tối ưu phân trang cơ bản cho website nội bộ quy mô nhỏ trong nhóm 3 người.";
    case "short_text":
    default:
      return isWeak
        ? "Chưa có kinh nghiệm trong lĩnh vực này."
        : isStrong
          ? "6 năm kinh nghiệm Production, sẵn sàng dẫn dắt kỹ thuật."
          : "Có kinh nghiệm triển khai thực tế và sẵn sàng trao đổi chi tiết.";
  }
}
