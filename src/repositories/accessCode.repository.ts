import { prisma } from "../infra/db/prisma";

export async function createAccessCode(
  code: string,
  payload: Record<string, unknown>
) {
  return prisma.accessCode.create({
    data: {
      code,
      payload,
    },
  });
}

export async function findAccessCode(code: string) {
  return prisma.accessCode.findUnique({ where: { code } });
}
