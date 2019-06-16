import { AppManager} from "./AppManager";

export interface ModuleMap{
  [key:string]:unknown[]
}


export class AppModule {
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
  addEventListener<K extends keyof ModuleMap>(name: K, proc: (...params: ModuleMap[K]) => unknown): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name] = [proc];
      return;
    }
    if (listener.indexOf(proc) >= 0)
      return;
    listener.push(proc);
  }
  removeEventListener<K extends keyof ModuleMap>(name: K, proc: ModuleMap[K]): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name] = [proc];
      return;
    }
    const index = listener.indexOf(proc);
    if (index < 0)
      return;
    listener.splice(index, 1);
  }
  callEvent<K extends keyof ModuleMap>(name: K, ...params: ModuleMap[K]) {
    const listener = this.listeners[name];
    if (listener) {
      for (const proc of listener) {
        (proc as ((...params: ModuleMap[K]) => unknown))(...params);
      }
    }
  }
}
