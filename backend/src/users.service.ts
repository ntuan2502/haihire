import { Injectable } from "@nestjs/common";
import { listUsers } from "./prisma/users";

@Injectable()
export class UsersService {
  async findAll() {
    return listUsers(10);
  }
}
