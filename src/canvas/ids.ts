import { nanoid } from "nanoid";

export const ids = {
  page: () => `page_${nanoid(8)}`,
  query: () => `query_${nanoid(8)}`,
  ai: () => `ai_${nanoid(8)}`,
  text: () => `text_${nanoid(8)}`,
  variable: () => `variable_${nanoid(8)}`,
  result: (parentId: string, index = 0) => `${parentId}-result-${index}`,
  chart: (parentId: string) => `${parentId}-chart`,
  chat: (parentId: string) => `${parentId}-chat`,
  error: (parentId: string) => `${parentId}-error`,
  edge: (source: string, target: string) => `${source}->${target}`,
};
