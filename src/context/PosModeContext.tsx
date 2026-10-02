import { createContext, useContext } from 'react';

// Lets an admin step into the seller POS ("modo venta") and back out. The admin
// and seller run different navigators; rather than merge them, entering POS mode
// swaps the admin's root for the real seller navigator (same screens, same cart),
// so the whole POS is reused as-is. `isAdminPos` tells the seller navigator to
// show an exit affordance; it's false for an actual seller.
type PosModeValue = {
  isAdminPos: boolean;
  enter: () => void;
  exit: () => void;
};

const PosModeContext = createContext<PosModeValue>({
  isAdminPos: false,
  enter: () => {},
  exit: () => {},
});

export const PosModeProvider = PosModeContext.Provider;

export function usePosMode(): PosModeValue {
  return useContext(PosModeContext);
}
