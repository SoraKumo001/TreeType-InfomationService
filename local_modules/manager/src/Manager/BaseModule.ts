/**
 *アプリケーション全体の管理
 *通信アダプターやモジュールインスタンスを取り扱う
 */

import * as JWF from "@jswf/core";
import { Manager} from "./Manager";

export interface ModuleMap{
  [key:string]:unknown[]
}

export class BaseModuleRemover implements JWF.WindowRemover{
  private module:BaseModule;
  private name:string;
  private proc:(...params: unknown[]) => void;
  public constructor(module:BaseModule,name:string,proc:(...params: unknown[]) => void){
    this.module = module;
    this.name = name;
    this.proc = proc;
  }
  public remove(){
    this.module.removeEventListener(this.name,this.proc);
  }
}
export class BaseModule<T extends ModuleMap=ModuleMap> {
  private listeners: ModuleMap = {};
  private manager: Manager;
  public constructor(manager: Manager) {
    this.manager = manager;
  }
  public getManager() {
    return this.manager;
  }
  public getAdapter() {
    return this.manager.getAdapter();
  }
  public addEventListener<K extends keyof T>(name: K, proc: (...params: T[K]) => void):BaseModuleRemover {
    const listener = this.listeners[name as string];
    if (!listener) {
      this.listeners[name as string] = [proc];
    }else if (listener.indexOf(proc) === -1)
      listener.push(proc);
    return new BaseModuleRemover(this,name as string,proc as (...params: unknown[]) => void);
  }
  public removeEventListener<K extends keyof T>(name: K, proc:(...params: T[K]) => void): void {
    const listener = this.listeners[name as string];
    if (!listener) {
      this.listeners[name as string] = [proc];
      return;
    }
    const index = listener.indexOf(proc);
    if (index < 0)
      return;
    listener.splice(index, 1);
  }
  public callEvent<K extends keyof T>(name: K, ...params: T[K]) {
    const listener = this.listeners[name as string];
    if (listener) {
      for (const proc of listener) {
        (proc as ((...params: T[K]) => unknown))(...params);
      }
    }
  }
}
