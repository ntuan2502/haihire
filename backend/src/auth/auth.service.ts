import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { PrismaService } from "../prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async validateRecruiter(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    let user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "password",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    )
      .where((u) => u.email.eq(normalizedEmail))
      .first();

    // Auto-provision demo accounts if database is fresh
    if (!user) {
      const demoAccounts: Record<
        string,
        { name: string; role: "HR" | "ADMIN" | "INTERVIEWER" }
      > = {
        "demo@tun.io.vn": { name: "Demo Recruiter", role: "HR" },
        "hr@tun.io.vn": { name: "HR Lead / Recruiter", role: "HR" },
        "admin@tun.io.vn": { name: "Talent Acquisition Admin", role: "ADMIN" },
        "interviewer@tun.io.vn": {
          name: "Technical Interviewer",
          role: "INTERVIEWER",
        },
      };

      if (demoAccounts[normalizedEmail] && dto.password === "password123") {
        const demoConfig = demoAccounts[normalizedEmail];
        const hashedPassword = bcrypt.hashSync("password123", 10);
        user = await this.prisma.db.orm.public.User.upsert({
          create: {
            email: normalizedEmail,
            name: demoConfig.name,
            role: demoConfig.role,
            password: hashedPassword,
            organizationId: null,
          },
          update: {
            password: hashedPassword,
            name: demoConfig.name,
            role: demoConfig.role,
          },
          conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
        });
      }
    }

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Role check: Only Recruiters, HR, Admin, Interviewers are allowed to access Recruiter Portal
    if (user.role === "CANDIDATE") {
      throw new ForbiddenException(
        "Access denied. The Recruiter Portal is strictly reserved for Hiring Managers, HR, and Admins. Candidates should apply via the public job board.",
      );
    }

    const { password: _, ...sanitizedUser } = user;

    let organization = null;
    if (sanitizedUser.organizationId) {
      organization = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
        "inviteCode",
      )
        .where((o) => o.id.eq(sanitizedUser.organizationId as string))
        .first();
    }

    return {
      ...sanitizedUser,
      organization,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateRecruiter(dto);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.db.orm.public.User.select("id")
      .where((u) => u.email.eq(normalizedEmail))
      .first();

    if (existing) {
      throw new ConflictException(
        "An account with this email address already exists.",
      );
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);
    const id = crypto.randomUUID();

    await this.prisma.db.orm.public.User.upsert({
      create: {
        id,
        email: normalizedEmail,
        name: dto.name.trim(),
        password: hashedPassword,
        role: "HR",
        organizationId: null,
      },
      update: {},
      conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
    });

    const user = {
      id,
      email: normalizedEmail,
      name: dto.name.trim(),
      role: "HR" as const,
      avatarUrl: null,
      organizationId: null,
      organization: null,
      createdAt: new Date(),
    };

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user) {
      throw new UnauthorizedException("User session expired or not found");
    }

    let organization = null;
    if (user.organizationId) {
      organization = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
        "inviteCode",
      )
        .where((o) => o.id.eq(user.organizationId as string))
        .first();
    }

    return {
      ...user,
      organization,
    };
  }
}
