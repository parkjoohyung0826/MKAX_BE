import { Request, Response } from "express";
import { getItems } from "../services/item.service";

export const getItemList = async (_: Request, res: Response) => {
  const items = await getItems();
  res.json(items);
};