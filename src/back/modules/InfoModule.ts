import * as amf from "@rfcs/core";

/**
 *テストモジュール
 *
 * @export
 * @class TestModule
 * @extends {amf.Module}
 */
export class InfoModule extends amf.Module {
  public static getModuleInfo(): amf.ModuleInfo {
    return {
      className: this.name,
      name: "テストモジュール",
      version: 1,
      author: "空雲",
      info: "テスト用"
    };
  }
  @amf.EXPORT
  public add(a: number, b: number) {
    return a + b;
  }
  @amf.EXPORT
  public getModuleInfo() {
    const manager = this.getManager();
    const types = manager.getModuleTypes();
    const infos: amf.ModuleInfo[] = [];
    for (const type of Object.values(types)) {
      infos.push(type.getModuleInfo());
    }
    return infos;
  }
}
