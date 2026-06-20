import { useEffect, useState } from "react";

type Selector<TState, TSelected> = (state: TState) => TSelected;
type BoundStore<TState, TSelected> = (selector: Selector<TState, TSelected>) => TSelected;

/**
 * This hook fixes hydration when persisted store state loads from localStorage.
 */
export const useStore = <TState, TSelected>(
  store: BoundStore<TState, TSelected>,
  callback: Selector<TState, TSelected>,
) => {
  const result = store(callback);
  const [data, setData] = useState<TSelected>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
};
