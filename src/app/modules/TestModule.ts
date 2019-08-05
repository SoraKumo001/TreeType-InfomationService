import * as amf from "active-module-framework";

/**
 *テストモジュール
 *
 * @export
 * @class TestModule
 * @extends {amf.Module}
 */
export class TestModule extends amf.Module {
  public static getModuleInfo(): amf.ModuleInfo {
    return {
      className: this.name,
      name: "テストモジュール",
      version: 1,
      author: "空雲",
      info: "テスト用"
    };
  }

  public JS_add(a: number, b: number) {
    return a + b;
  }
  public JS_getModuleInfo() {
    const manager = this.getManager();
    const types = manager.getModuleTypes();
    const infos: amf.ModuleInfo[] = [];
    for (const type of Object.values(types)) {
      infos.push(type.getModuleInfo());
    }
    return infos;
  }
}
