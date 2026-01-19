import { findAllItems } from "../repositories/item.repository";

export const getItems = () => {
  return findAllItems();
};