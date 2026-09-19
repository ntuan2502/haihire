import { Injectable } from "@nestjs/common";
import { db } from "../prisma/db.ts";
import { seed } from "../prisma/seed.ts";

export interface StarterUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface PaginatedUsersResult {
  data: StarterUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  async findAll(options?: { page?: number; limit?: number }): Promise<PaginatedUsersResult> {
    await seed();
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;

    const allUsers = await db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "avatarUrl",
      "createdAt",
    ).all();

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const pagedUsers = allUsers.slice((page - 1) * limit, page * limit);

    return {
      data: pagedUsers.map((user) => ({
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
