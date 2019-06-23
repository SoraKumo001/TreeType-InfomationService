import * as JWF from "javascript-window-framework";
import { FileModule, FileInfo } from "../../modules/FileModule";
import { AppManager } from "../../AppManager";
import { DirView } from "./DirView";
import { FileView } from "./FileView";
interface CustomMap extends JWF.WINDOW_EVENT_MAP {
  enterFile: [{fileInfo:FileInfo, enter:boolean}];
}
/**
 *
 *
 * @export
 * @class FileWindow
 * @extends {JWF.FrameWindow}
 */
export class FileWindow<T extends CustomMap> extends JWF.FrameWindow<T> {
  public constructor(manager: AppManager) {
    super();

    const fileModule = manager.getModule(FileModule);

    this.setTitle("ファイルマネージャー");
    this.setSize(800, 400);

    //分割バーの設定
    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(250);

    const dirTree = new DirView(fileModule);
    splitter.addChild(0, dirTree, "client");

    const fileView = new FileView(fileModule);
    splitter.addChild(1, fileView, "client");

    fileView.addEventListener(
      "selectDir",
      (parentId): void => {
        dirTree.selectDir(parentId as number);
      }
    );
    fileView.addEventListener(
      "enterFile",
      (param): void => {
        this.callEvent("enterFile",param);
      }
    );

    dirTree.getTree().addEventListener("itemSelect", () => {
      fileView.loadFiles(dirTree.getDirId());
    });

  }
}
