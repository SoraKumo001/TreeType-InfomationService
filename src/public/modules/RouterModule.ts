import { AppModule, ModuleMap } from "../AppModule";
import { AppManager } from "../AppManager";

export interface CustomMap extends ModuleMap {
  goLocation: [{ [key: string]: string }]; //parameter
}

export class RouterModule extends AppModule<CustomMap> {
  lastParams: string;
  constructor(manager: AppManager) {
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
  setLocationParams(params: { [key: string]: string|number }) {
    const p = Object.assign(this.getLocationParams(), params);
    let search = "";
    for (let key of Object.keys(p)) {
      if (search.length) search += "&";
      if (p[key] !== null) search = `${encodeURI(key)}=${encodeURI(p[key])}`;
    }
    if (this.lastParams !== search) {
      window.history.pushState(null, "", "?" + search);
      this.lastParams = search;
    }
  }
  getLocationParams() {
    //パラメータの読み出し
    var p: { [key: string]: string } = {};
    window.location.search
      .substring(1)
      .split("&")
      .forEach(function(v) {
        const s = v.split("=");
        p[decodeURI(s[0])] = decodeURI(s[1]);
      });
    return p;
  }
  goLocation() {
    const p = this.getLocationParams();
    console.log(window.location.search);
    this.lastParams = window.location.search.substring(1);
    this.callEvent("goLocation", p);
  }
}
