import { BaseModule, ModuleMap } from "./BaseModule";
import { Manager } from "./Manager";

export interface CustomMap extends ModuleMap {
  goLocation: [{ [key: string]: string }]; //parameter
}

/**
 *URLハッシュルーティングモジュール
 *
 * @export
 * @class RouterModule
 * @extends {BaseModule<CustomMap>}
 */
export class RouterModule extends BaseModule<CustomMap> {
  private lastParams: string;
  public constructor(manager: Manager) {
    super(manager);
    this.lastParams = "";
    window.addEventListener(
      "popstate",
      () => {
        this.goLocation();
      },
      false
    );
  }
  public setLocationParam(
    name: string | number,
    value: string | number | null | undefined,
    history?: boolean
  ) {
    const values = this.getLocationParams();
    if (value == null) delete values[name];
    else values[name.toString()] = value.toString();
    this.updateLocation(values,history);
  }

  public setLocationParams(
    params: { [key: string]: string | number | null },
    history?: boolean
  ) {
    const p = this.getLocationParams();
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (value === null || value === "") delete p[key];
      else if (typeof value === "number") p[key] = value.toString();
      else p[key] = value;
    }
    this.updateLocation(p,history);
  }
  private updateLocation(
    p: { [key: string]: string | number | boolean },
    history?: boolean
  ) {
    let search = "";
    for (const key of Object.keys(p)) {
      if (p[key] != null) {
        let value = p[key];
        if (value.toString) value = value.toString();
        if (search.length) search += "&";
        search += `${encodeURI(key)}=${encodeURI(value as string)}`;
      }
    }
    if (this.lastParams !== search) {
      if (history === undefined || history)
        window.history.pushState(null, "", "?" + search);
      else window.history.replaceState(null, "", "?" + search);
      this.lastParams = search;
    }
  }
  public getLocationParams() {
    //パラメータの読み出し
    const p: { [key: string]: string } = {};
    window.location.search
      .substring(1)
      .split("&")
      .forEach(function(v) {
        const s = v.split("=");
        if (s[0].length && s[1].length) p[decodeURI(s[0])] = decodeURI(s[1]);
      });
    return p;
  }
  public getLocationParam(name: string) {
    return this.getLocationParams()[name];
  }
  public async goLocation() {
    const p = this.getLocationParams();
    this.lastParams = window.location.search.substring(1);
    this.callEvent("goLocation", p);
  }
}
