import { AppManager} from "./AppManager";

export interface ModuleMap{
  [key:string]:unknown[]
}


export class AppModule<T extends ModuleMap=ModuleMap> {
  private listeners: {
    [key: string]: unknown[];
  } = {};
  private manager: AppManager;
  public constructor(manager: AppManager) {
    this.manager = manager;
  }
  public getManager() {
    return this.manager;
  }
  public getAdapter() {
    return this.manager.getAdapter();
  }
  addEventListener<K extends keyof T>(name: K&string, proc: (...params: T[K]) => void): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name as string] = [proc];
      return;
    }
    if (listener.indexOf(proc) >= 0)
      return;
    listener.push(proc);
  }
  removeEventListener<K extends keyof T>(name: K&string, proc:(...params: T[K]) => void): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name as string] = [proc];
      return;
    }
    const index = listener.indexOf(proc);
    if (index < 0)
      return;
    listener.splice(index, 1);
  }
  callEvent<K extends keyof T>(name: K&string, ...params: T[K]) {
    const listener = this.listeners[name];
    if (listener) {
      for (const proc of listener) {
        (proc as ((...params: T[K]) => unknown))(...params);
      }
    }
  }
}
