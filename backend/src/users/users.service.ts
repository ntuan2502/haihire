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

@Injectable()
export class UsersService {
  async findAll(limit = 10): Promise<StarterUser[]> {
    await seed();
    const users = await db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "avatarUrl",
      "createdAt",
    )
      .take(limit)
      .all();

    return users.map((user) => ({
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
    }));
  }
}
