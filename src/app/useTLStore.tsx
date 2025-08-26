import { useEffect, useState } from "react";
import {
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  TLStore,
} from "tldraw";
import { customShapes } from "../shapes";

export const useTLStore = () => {
  const [store, setStore] = useState<TLStore>();

  useEffect(() => {
    const tlStore = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...customShapes],
      bindingUtils: [...defaultBindingUtils],
    });
    setStore(tlStore);

    return () => {
      tlStore.dispose();
    };
  }, []);

  return store;
};
