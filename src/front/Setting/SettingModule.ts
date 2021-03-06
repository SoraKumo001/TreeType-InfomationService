import { BaseView } from "@jswf/core";
import { BaseModule } from "../Manager/BaseModule";
import { Manager } from "../Manager/Manager";
/**
 *基本データ設定用モジュール
 *
 * @export
 * @class SettingView
 * @extends {BaseView}
 */
export class SettingView extends BaseView {
  private manager: Manager;
  public constructor(manager: Manager) {
    super();
    this.manager = manager;
  }
  public getManager() {
    return this.manager;
  }
}
export interface SettingData {
  name: string;
  view: typeof SettingView | null;
  child: SettingData[];
}
export class SettingModule extends BaseModule {
  private settings: SettingData[] = [];

  public addSetting(name: string, view?: typeof SettingView) {
    const names = name.split("/");
    let settings = this.settings;
    let data: SettingData | null = null;
    for (const key of names) {
      const count = settings.length;
      data = null;
      for (let i = 0; i < count; i++) {
        if (settings[i].name === key) {
          data = settings[i];
          break;
        }
      }
      if (!data) {
        data = { name: key, view: null, child: [] };
        settings.push(data);
      }
      settings = data.child;
    }
    if (data) {
      data.view = view ? view : null;
    }
  }
  public getSettings() {
    return this.settings;
  }
}
