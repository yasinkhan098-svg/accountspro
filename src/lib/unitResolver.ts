/**
 * Central Unit Resolver Utility for LedgerX
 * Resolves item units cleanly (e.g. "PKT", "Kg", "PCS", "Rol", "BTL", "Nos")
 * without ever falling back to "Nos" when a valid unit is saved in any field.
 */

export function resolveUnitString(it: any, allUnitsList?: any[]): string {
  if (!it) return 'Nos';

  // 1. Direct unitName string (e.g. from database, Prisma, or manual entry)
  if (typeof it.unitName === 'string') {
    const trimmed = it.unitName.trim();
    if (trimmed && trimmed !== '-' && trimmed !== '—' && trimmed !== 'undefined' && trimmed !== 'null') {
      return trimmed;
    }
  }

  // 2. Direct unit string
  if (typeof it.unit === 'string') {
    const trimmed = it.unit.trim();
    if (trimmed && trimmed !== '-' && trimmed !== '—' && trimmed !== 'undefined' && trimmed !== 'null') {
      return trimmed;
    }
  }

  // 3. Unit as object { symbol, name, formalName }
  if (it.unit && typeof it.unit === 'object') {
    if (typeof it.unit.symbol === 'string' && it.unit.symbol.trim()) return it.unit.symbol.trim();
    if (typeof it.unit.name === 'string' && it.unit.name.trim()) return it.unit.name.trim();
    if (typeof it.unit.formalName === 'string' && it.unit.formalName.trim()) return it.unit.formalName.trim();
  }

  // 4. Other commonly used unit fields
  if (typeof it.baseUnit === 'string' && it.baseUnit.trim()) return it.baseUnit.trim();
  if (typeof it.uom === 'string' && it.uom.trim()) return it.uom.trim();
  if (typeof it.symbol === 'string' && it.symbol.trim()) return it.symbol.trim();

  // 5. Lookup by unitId in provided allUnits list
  const uId = Number(it.unitId !== undefined ? it.unitId : it.unit);
  if (!isNaN(uId) && uId > 0 && Array.isArray(allUnitsList)) {
    const matched = allUnitsList.find(u => Number(u.id) === uId);
    if (matched) {
      if (typeof matched.symbol === 'string' && matched.symbol.trim()) return matched.symbol.trim();
      if (typeof matched.name === 'string' && matched.name.trim()) return matched.name.trim();
    }
  }

  // 6. Nested stockItem relation (e.g. from inventoryEntry)
  if (it.stockItem) {
    const nested = resolveUnitString(it.stockItem, allUnitsList);
    if (nested && nested !== 'Nos') return nested;
  }

  return 'Nos';
}

