import { db } from "@/lib/db";

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}

export async function getTwoFactorConfirmationByUserId(userId: string) {
  return db.twoFactorConfirmation.findUnique({ where: { userId } });
}
