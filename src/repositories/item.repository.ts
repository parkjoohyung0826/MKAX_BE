import { prisma } from "../infra/db/prisma";

export const findAllItems = () => {
  return prisma.item.findMany();
};