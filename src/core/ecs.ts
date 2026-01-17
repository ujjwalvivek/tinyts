/** Unique numeric identifier for an entity in the ECS registry. */
export type Entity = number;

/** Marker interface for component types. */
export interface Component {
  // Marker interface for component types
}

/** Query descriptor for `Registry.view()` with inclusion/exclusion filters. */
export interface QueryConfig {
  /** Component classes the entity must have. */
  with: (new (...args: any[]) => any)[];
  /** Component classes the entity must not have. */
  without?: (new (...args: any[]) => any)[];
}

/** Component linking an entity to its parent entity. */
export class Parent {
  constructor(public entity: Entity) {}
}

/** Component storing an entity's child entities. */
export class Children {
  constructor(public entities: Entity[] = []) {}
}

let nextComponentTypeId = 0;
const componentTypeIds = new Map<Function, number>();

function getComponentTypeId(cls: Function): number {
  let id = componentTypeIds.get(cls);
  if (id === undefined) {
    id = nextComponentTypeId++;
    componentTypeIds.set(cls, id);
  }
  return id;
}

type ComponentCallback = (entity: Entity, component: any) => void;

/**
 * Central ECS registry that manages entities, components, views, and hierarchy.
 *
 * Supports component pooling, cached archetype views, event hooks, and JSON serialization.
 */
export class Registry {
  private nextEntityId: Entity = 1;
  private readonly freeList: Entity[] = [];
  private readonly entities = new Set<Entity>();
  private readonly components = new Map<number, Map<Entity, any>>();
  private readonly viewCache = new Map<string, Entity[]>();
  private readonly viewQueries = new Map<string, { with: any[]; without?: any[] }>();
  private readonly componentPools = new Map<number, any[]>();

  // Event hook mappings
  private readonly addListeners = new Map<number, Set<ComponentCallback>>();
  private readonly removeListeners = new Map<number, Set<ComponentCallback>>();

  // Serialization mapping
  private readonly registeredTypes = new Map<string, new (...args: any[]) => any>();
  private readonly typeNameIds = new Map<number, string>();

  /** Create a new entity, reusing a recycled ID when available. */
  createEntity(): Entity {
    const entity = this.freeList.length > 0 ? this.freeList.pop()! : this.nextEntityId++;
    this.entities.add(entity);
    return entity;
  }

  /** Destroy an entity, removing all its components and hierarchy links. */
  destroyEntity(entity: Entity): void {
    if (!this.entities.has(entity)) return;
    this.entities.delete(entity);

    // 1. Resolve hierarchies (clean parent and children lists)
    const childrenComp = this.getComponent(entity, Children);
    if (childrenComp) {
      for (const child of childrenComp.entities) {
        this.removeComponent(child, Parent);
      }
    }
    const parentComp = this.getComponent(entity, Parent);
    if (parentComp) {
      const parent = parentComp.entity;
      const siblingComp = this.getComponent(parent, Children);
      if (siblingComp) {
        const idx = siblingComp.entities.indexOf(entity);
        if (idx !== -1) siblingComp.entities.splice(idx, 1);
      }
    }

    // 2. Clear components and trigger remove listeners
    for (const [typeId, store] of this.components.entries()) {
      if (store.has(entity)) {
        const component = store.get(entity);
        store.delete(entity);

        const listeners = this.removeListeners.get(typeId);
        if (listeners) {
          for (const callback of listeners) {
            callback(entity, component);
          }
        }

        let pool = this.componentPools.get(typeId);
        if (!pool) {
          pool = [];
          this.componentPools.set(typeId, pool);
        }
        pool.push(component);
      }
    }

    // 3. Remove from view caches
    for (const cachedEntities of this.viewCache.values()) {
      const idx = cachedEntities.indexOf(entity);
      if (idx !== -1) {
        cachedEntities.splice(idx, 1);
      }
    }

    this.freeList.push(entity);
  }

  /** Attach a component instance to an entity, triggering onAdded listeners. */
  addComponent<T>(
    entity: Entity,
    componentClass: new (...args: any[]) => T,
    component: T,
  ): T {
    const typeId = getComponentTypeId(componentClass);
    let store = this.components.get(typeId);
    if (!store) {
      store = new Map<Entity, any>();
      this.components.set(typeId, store);
    }
    store.set(entity, component);
    this.updateEntityInCaches(entity);

    // Trigger onAdded event
    const listeners = this.addListeners.get(typeId);
    if (listeners) {
      for (const callback of listeners) {
        callback(entity, component);
      }
    }

    return component;
  }

  /** Retrieve a component from an entity, or undefined if not present. */
  getComponent<T>(
    entity: Entity,
    componentClass: new (...args: any[]) => T,
  ): T | undefined {
    const typeId = getComponentTypeId(componentClass);
    return this.components.get(typeId)?.get(entity);
  }

  /** Check whether an entity has a given component type. */
  hasComponent(entity: Entity, componentClass: new (...args: any[]) => any): boolean {
    const typeId = getComponentTypeId(componentClass);
    return this.components.get(typeId)?.has(entity) ?? false;
  }

  /** Remove a component from an entity, triggering onRemoved listeners and pooling the instance. */
  removeComponent(entity: Entity, componentClass: new (...args: any[]) => any): void {
    const typeId = getComponentTypeId(componentClass);
    const store = this.components.get(typeId);
    if (store && store.has(entity)) {
      const component = store.get(entity);
      store.delete(entity);

      // Trigger onRemoved event
      const listeners = this.removeListeners.get(typeId);
      if (listeners) {
        for (const callback of listeners) {
          callback(entity, component);
        }
      }

      let pool = this.componentPools.get(typeId);
      if (!pool) {
        pool = [];
        this.componentPools.set(typeId, pool);
      }
      pool.push(component);
      this.updateEntityInCaches(entity);
    }
  }

  /**
   * Register a callback invoked whenever a component of this type is added.
   * @returns Unsubscribe function.
   */
  onAdded<T>(
    componentClass: new (...args: any[]) => T,
    callback: (entity: Entity, component: T) => void,
  ): () => void {
    const typeId = getComponentTypeId(componentClass);
    let listeners = this.addListeners.get(typeId);
    if (!listeners) {
      listeners = new Set();
      this.addListeners.set(typeId, listeners);
    }
    listeners.add(callback);
    return () => {
      listeners?.delete(callback);
    };
  }

  /**
   * Register a callback invoked whenever a component of this type is removed.
   * @returns Unsubscribe function.
   */
  onRemoved<T>(
    componentClass: new (...args: any[]) => T,
    callback: (entity: Entity, component: T) => void,
  ): () => void {
    const typeId = getComponentTypeId(componentClass);
    let listeners = this.removeListeners.get(typeId);
    if (!listeners) {
      listeners = new Set();
      this.removeListeners.set(typeId, listeners);
    }
    listeners.add(callback);
    return () => {
      listeners?.delete(callback);
    };
  }

  /** Set or clear an entity's parent, updating Parent/Children components on both sides. */
  setParent(child: Entity, parent: Entity | null): void {
    const oldParentComp = this.getComponent(child, Parent);
    if (oldParentComp) {
      const oldParent = oldParentComp.entity;
      const childrenComp = this.getComponent(oldParent, Children);
      if (childrenComp) {
        const idx = childrenComp.entities.indexOf(child);
        if (idx !== -1) childrenComp.entities.splice(idx, 1);
      }
      this.removeComponent(child, Parent);
    }

    if (parent === null) return;

    this.addComponent(child, Parent, this.obtain(Parent, parent));
    let childrenComp = this.getComponent(parent, Children);
    if (!childrenComp) {
      childrenComp = this.addComponent(parent, Children, this.obtain(Children, []));
    }
    if (!childrenComp.entities.includes(child)) {
      childrenComp.entities.push(child);
    }
  }

  /** Register a component class for serialization under the given name. */
  registerComponentType(name: string, constructor: new (...args: any[]) => any): void {
    this.registeredTypes.set(name, constructor);
    const typeId = getComponentTypeId(constructor);
    this.typeNameIds.set(typeId, name);
  }

  /** Serialize all entities and registered components to a JSON string. */
  serialize(): string {
    const data: { entities: Entity[]; components: Record<string, Record<Entity, any>> } = {
      entities: Array.from(this.entities),
      components: {},
    };

    for (const [typeId, store] of this.components.entries()) {
      const typeName = this.typeNameIds.get(typeId);
      if (!typeName) continue;

      const storeData: Record<Entity, any> = {};
      for (const [entity, component] of store.entries()) {
        const serializedComponent: Record<string, any> = {};
        for (const key of Object.keys(component)) {
          const val = (component as any)[key];
          if (typeof val !== 'function') {
            serializedComponent[key] = val;
          }
        }
        storeData[entity] = serializedComponent;
      }
      data.components[typeName] = storeData;
    }

    return JSON.stringify(data);
  }

  /** Clear the registry and restore state from a JSON string produced by `serialize()`. */
  deserialize(json: string): void {
    this.clear();
    const data = JSON.parse(json);

    for (const entity of data.entities) {
      this.entities.add(entity);
      if (entity >= this.nextEntityId) {
        this.nextEntityId = entity + 1;
      }
    }

    for (const [typeName, storeData] of Object.entries(data.components)) {
      const constructor = this.registeredTypes.get(typeName);
      if (!constructor) continue;

      for (const [entityStr, compData] of Object.entries(storeData as Record<string, any>)) {
        const entity = parseInt(entityStr, 10);
        const instance = this.obtain(constructor);
        Object.assign(instance as any, compData);
        this.addComponent(entity, constructor, instance);
      }
    }
  }

  private updateEntityInCaches(entity: Entity): void {
    for (const [queryKey, config] of this.viewQueries.entries()) {
      let match = true;
      for (const cls of config.with) {
        if (!this.hasComponent(entity, cls)) {
          match = false;
          break;
        }
      }
      if (match && config.without) {
        for (const cls of config.without) {
          if (this.hasComponent(entity, cls)) {
            match = false;
            break;
          }
        }
      }

      const cached = this.viewCache.get(queryKey)!;
      const idx = cached.indexOf(entity);
      if (match) {
        if (idx === -1) {
          cached.push(entity);
        }
      } else {
        if (idx !== -1) {
          cached.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Query entities matching a set of component types. Results are cached.
   *
   * Accepts either component classes as rest args, or a `QueryConfig` with `with`/`without` arrays.
   */
  view<T extends any[]>(
    ...componentClasses: { [K in keyof T]: new (...args: any[]) => T[K] }
  ): Entity[];
  view(config: QueryConfig): Entity[];
  view(
    ...args: any[]
  ): Entity[] {
    if (args.length === 0) return [];

    let withClasses: (new (...args: any[]) => any)[] = [];
    let withoutClasses: Function[] = [];

    if (args[0] && typeof args[0] === 'object' && 'with' in args[0]) {
      const config = args[0] as { with: any[]; without?: any[] };
      withClasses = config.with;
      withoutClasses = config.without || [];
    } else {
      withClasses = args as any[];
    }

    if (withClasses.length === 0) return [];

    const withIds = withClasses.map(cls => getComponentTypeId(cls)).sort((a, b) => a - b);
    const withoutIds = withoutClasses.map(cls => getComponentTypeId(cls)).sort((a, b) => a - b);
    const queryKey = `with:${withIds.join(',')}|without:${withoutIds.join(',')}`;

    let cached = this.viewCache.get(queryKey);
    if (cached !== undefined) {
      return cached;
    }

    cached = [];
    this.viewCache.set(queryKey, cached);
    this.viewQueries.set(queryKey, { with: withClasses, without: withoutClasses });

    const firstTypeId = withIds[0];
    const firstStore = this.components.get(firstTypeId);
    if (firstStore) {
      for (const entity of firstStore.keys()) {
        let match = true;
        for (let i = 1; i < withClasses.length; i++) {
          if (!this.hasComponent(entity, withClasses[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          for (const cls of withoutClasses) {
            if (this.hasComponent(entity, cls as any)) {
              match = false;
              break;
            }
          }
        }
        if (match) {
          cached.push(entity);
        }
      }
    }

    return cached;
  }

  /**
   * Get a pooled component instance, or create a new one.
   *
   * Reused instances have their `init()` or `reset()` method called with the provided args.
   */
  obtain<T>(
    componentClass: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    const typeId = getComponentTypeId(componentClass);
    let pool = this.componentPools.get(typeId);
    if (!pool) {
      pool = [];
      this.componentPools.set(typeId, pool);
    }
    if (pool.length > 0) {
      const instance = pool.pop()!;
      if (typeof (instance as any).init === 'function') {
        (instance as any).init(...args);
      } else if (typeof (instance as any).reset === 'function') {
        (instance as any).reset(...args);
      }
      return instance;
    }
    return new componentClass(...args);
  }

  /** Remove all entities, components, caches, pools, and listeners. */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.viewCache.clear();
    this.viewQueries.clear();
    this.componentPools.clear();
    this.addListeners.clear();
    this.removeListeners.clear();
    this.freeList.length = 0;
    this.nextEntityId = 1;
  }
}
