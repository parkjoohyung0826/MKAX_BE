import { Prisma } from "@prisma/client";
import { prisma } from "../infra/db/prisma";

export async function createAccessCode(
  code: string,
  payload: Prisma.InputJsonValue
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
  payload: Prisma.InputJsonValue
) {
  return prisma.accessCode.update({
    where: { code },
    data: { payload },
  });
}

export async function deleteAccessCode(code: string) {
  return prisma.accessCode.delete({ where: { code } });
}
