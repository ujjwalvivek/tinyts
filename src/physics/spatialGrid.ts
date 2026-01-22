import type { AABB } from "./aabb";

/**
 * Grid cell stride for packing (x, y) into a single integer key.
 * Supports up to ~65k cells in each direction, which is ample for any
 * practical game world (e.g. 65536 × cellSize = 655 km at 10 px/cell).
 */
const CELL_STRIDE = 65536;

interface GridCell {
    ids: Set<number>;
}

/** A 2D spatial hashing grid for broad-phase collision detection. */
export interface SpatialGrid {
    /** Size of each grid cell in world units. */
    cellSize: number;
    /** Clear all entities from the grid. */
    clear: () => void;
    /** Insert an entity ID into the grid. */
    insert: (id: number, aabb: AABB) => void;
    /** Query entity IDs overlapping an AABB. */
    query: (aabb: AABB) => Set<number>;
    /** Get all entity IDs in the grid. */
    queryAll: () => Set<number>;
    /** Query entity IDs overlapping an AABB, writing into the provided result set. */
    queryInto: (aabb: AABB, result: Set<number>) => Set<number>;
    /** Get all entity IDs, writing into the provided result set. */
    queryAllInto: (result: Set<number>) => Set<number>;
}

/** Create a spatial hash grid with a given cell size. */
export function createSpatialGrid(cellSize: number): SpatialGrid {
    if (cellSize <= 0 || !Number.isFinite(cellSize)) {
        throw new Error(
            "SpatialGrid cellSize must be a positive finite number.",
        );
    }

    const cells = new Map<number, GridCell>();
    const allIds = new Set<number>();

    function cellKey(x: number, y: number): number {
        return x * CELL_STRIDE + y;
    }

    function cellRange(aabb: AABB): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    } {
        const maxEpsilon = 0.001;
        return {
            minX: Math.floor(aabb.pos.x / cellSize),
            minY: Math.floor(aabb.pos.y / cellSize),
            maxX: Math.floor(
                (aabb.pos.x + aabb.size.x - maxEpsilon) / cellSize,
            ),
            maxY: Math.floor(
                (aabb.pos.y + aabb.size.y - maxEpsilon) / cellSize,
            ),
        };
    }

    function clear(): void {
        cells.clear();
        allIds.clear();
    }

    function insert(id: number, aabb: AABB): void {
        allIds.add(id);

        const { minX, minY, maxX, maxY } = cellRange(aabb);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = cellKey(x, y);
                let cell = cells.get(key);
                if (!cell) {
                    cell = { ids: new Set() };
                    cells.set(key, cell);
                }
                cell.ids.add(id);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    function query(aabb: AABB): Set<number> {
        const result = new Set<number>();
        return queryInto(aabb, result);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    function queryInto(aabb: AABB, result: Set<number>): Set<number> {
        const { minX, minY, maxX, maxY } = cellRange(aabb);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = cellKey(x, y);
                const cell = cells.get(key);
                if (cell) {
                    for (const id of cell.ids) {
                        result.add(id);
                    }
                }
            }
        }

        return result;
    }

    function queryAll(): Set<number> {
        return new Set(allIds);
    }

    function queryAllInto(result: Set<number>): Set<number> {
        for (const id of allIds) {
            result.add(id);
        }
        return result;
    }

    return {
        cellSize,
        clear,
        insert,
        query,
        queryAll,
        queryInto,
        queryAllInto,
    };
}
