import test from 'node:test';
import assert from 'node:assert/strict';
import { Registry, Parent, Children } from '../../../dist/tinyts.esm.js';

class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Velocity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Tag {}

test('ECS Registry creates entities and registers components', () => {
  const reg = new Registry();

  const entity = reg.createEntity();
  assert.ok(entity > 0);

  const pos = new Position(10, 20);
  reg.addComponent(entity, Position, pos);

  assert.ok(reg.hasComponent(entity, Position));
  assert.equal(reg.getComponent(entity, Position), pos);
  assert.equal(reg.getComponent(entity, Position).x, 10);
});

test('ECS Registry deletes components and destroys entities', () => {
  const reg = new Registry();

  const entity = reg.createEntity();
  reg.addComponent(entity, Position, new Position(0, 0));

  reg.removeComponent(entity, Position);
  assert.equal(reg.hasComponent(entity, Position), false);
  assert.equal(reg.getComponent(entity, Position), undefined);

  const e2 = reg.createEntity();
  reg.addComponent(e2, Position, new Position(1, 1));
  reg.addComponent(e2, Velocity, new Velocity(2, 2));

  reg.destroyEntity(e2);
  assert.equal(reg.hasComponent(e2, Position), false);
  assert.equal(reg.hasComponent(e2, Velocity), false);
});

test('ECS Registry view filters entities correctly', () => {
  const reg = new Registry();

  const e1 = reg.createEntity();
  reg.addComponent(e1, Position, new Position(1, 1));
  reg.addComponent(e1, Velocity, new Velocity(1, 1));

  const e2 = reg.createEntity();
  reg.addComponent(e2, Position, new Position(2, 2));

  const e3 = reg.createEntity();
  reg.addComponent(e3, Position, new Position(3, 3));
  reg.addComponent(e3, Velocity, new Velocity(3, 3));
  reg.addComponent(e3, Tag, new Tag());

  // View only Position
  const posView = reg.view(Position);
  assert.equal(posView.length, 3);
  assert.ok(posView.includes(e1));
  assert.ok(posView.includes(e2));
  assert.ok(posView.includes(e3));

  // View Position & Velocity
  const posVelView = reg.view(Position, Velocity);
  assert.equal(posVelView.length, 2);
  assert.ok(posVelView.includes(e1));
  assert.ok(posVelView.includes(e3));
  assert.ok(!posVelView.includes(e2));

  // View Position, Velocity & Tag
  const fullView = reg.view(Position, Velocity, Tag);
  assert.equal(fullView.length, 1);
  assert.ok(fullView.includes(e3));
});

test('ECS Registry Query Exclusions', () => {
  const reg = new Registry();

  const e1 = reg.createEntity();
  reg.addComponent(e1, Position, new Position(1, 1));

  const e2 = reg.createEntity();
  reg.addComponent(e2, Position, new Position(2, 2));
  reg.addComponent(e2, Velocity, new Velocity(2, 2));

  // Query Position but NOT Velocity
  const posWithoutVel = reg.view({ with: [Position], without: [Velocity] });
  assert.equal(posWithoutVel.length, 1);
  assert.ok(posWithoutVel.includes(e1));
  assert.ok(!posWithoutVel.includes(e2));
});

test('ECS Registry Event Hooks', () => {
  const reg = new Registry();
  const added = [];
  const removed = [];

  const unsubscribeAdd = reg.onAdded(Position, (entity, component) => {
    added.push({ entity, component });
  });

  const unsubscribeRemove = reg.onRemoved(Position, (entity, component) => {
    removed.push({ entity, component });
  });

  const entity = reg.createEntity();
  const pos = new Position(1, 2);
  reg.addComponent(entity, Position, pos);

  assert.equal(added.length, 1);
  assert.equal(added[0].entity, entity);
  assert.equal(added[0].component, pos);

  reg.removeComponent(entity, Position);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].entity, entity);
  assert.equal(removed[0].component, pos);

  unsubscribeAdd();
  unsubscribeRemove();
});

test('ECS Registry Parent-Child Hierarchies', () => {
  const reg = new Registry();

  const parent = reg.createEntity();
  const child = reg.createEntity();

  reg.setParent(child, parent);

  // Check bidirectional links
  assert.ok(reg.hasComponent(child, Parent));
  const parentComp = reg.getComponent(child, Parent);
  assert.equal(parentComp.entity, parent);

  assert.ok(reg.hasComponent(parent, Children));
  const childrenComp = reg.getComponent(parent, Children);
  assert.ok(childrenComp.entities.includes(child));

  // Check hierarchy cleanup on child destruction
  reg.destroyEntity(child);
  assert.equal(childrenComp.entities.length, 0);

  // Check hierarchy cleanup on parent destruction
  const child2 = reg.createEntity();
  reg.setParent(child2, parent);
  reg.destroyEntity(parent);
  assert.equal(reg.hasComponent(child2, Parent), false);
});

test('ECS Registry Serialization & Deserialization', () => {
  const reg = new Registry();
  reg.registerComponentType('Position', Position);
  reg.registerComponentType('Velocity', Velocity);

  const e1 = reg.createEntity();
  reg.addComponent(e1, Position, new Position(10, 20));

  const e2 = reg.createEntity();
  reg.addComponent(e2, Velocity, new Velocity(5, 5));

  const jsonStr = reg.serialize();
  
  const reg2 = new Registry();
  reg2.registerComponentType('Position', Position);
  reg2.registerComponentType('Velocity', Velocity);
  reg2.deserialize(jsonStr);

  assert.ok(reg2.hasComponent(e1, Position));
  assert.equal(reg2.getComponent(e1, Position).x, 10);
  assert.equal(reg2.getComponent(e1, Position).y, 20);

  assert.ok(reg2.hasComponent(e2, Velocity));
  assert.equal(reg2.getComponent(e2, Velocity).x, 5);
});
