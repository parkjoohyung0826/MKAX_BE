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

export async function updateAccessCode(
  code: string,
  payload: Record<string, unknown>
) {
  return prisma.accessCode.update({
    where: { code },
    data: { payload },
  });
}
