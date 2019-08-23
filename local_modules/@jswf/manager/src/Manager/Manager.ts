import * as JWF from "@jswf/core";
import { BaseModule } from "./BaseModule";
import { RouterModule } from "./RouterModule";

/**
 *
 *
 * @export
 * @class AppManager
 */
export class Manager {
  private modules: [typeof BaseModule, BaseModule][] = [];
  private adapter: JWF.Adapter;
  private router: RouterModule;
  /**
   *Creates an instance of AppManager.
   * @memberof AppManager
   */
  public constructor(name?: string) {
    //通信アダプタの作成
    this.adapter = new JWF.Adapter("./", name);

    this.router = this.getModule(RouterModule);
  }
  public getAdapter() {
    return this.adapter;
  }
  public getModule<T extends BaseModule>(moduleType: {
    new (manager: Manager): T;
  }): T {
    const modules = this.modules;
    const length = modules.length;
    for (let i = 0; i < length; i++) {
      if (modules[i][0] === moduleType) return modules[i][1] as T;
    }
    const module = new moduleType(this);
    this.modules.push([moduleType as typeof BaseModule, module]);
    return module;
  }
  public goLocation(
    params: { [key: string]: string | number | null | undefined },
    history?: boolean
  ): void;
  public goLocation(
    name: string,
    param: string | number | null | undefined,
    history?: boolean
  ): void;
  public goLocation(): void;
  public goLocation(p1?: unknown, p2?: unknown, p3?: unknown): void {
    if (p1) {
      if (typeof p1 === "string")
        this.router.setLocationParam(p1, p2 as string | number, p3 as boolean);
      else
        this.router.setLocationParams(
          p1 as { [key: string]: string | number },
          p2 as boolean
        );
    }
    this.router.goLocation();
  }

  public setLocationParam(name: string, param: string | number | undefined) {
    this.router.setLocationParam(name, param);
  }
  public getLocationParams() {
    return this.router.getLocationParams();
  }
  public getLocationParam(name: string) {
    return this.router.getLocationParams()[name];
  }
}
