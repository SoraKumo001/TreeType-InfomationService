import * as JWF from "javascript-window-framework";
import { FileModule } from "../modules/FileModule";
import { AppManager } from "../AppManager";
import { DirView } from "./DirView";
import { FileView } from "./FileView";


/**
 *
 *
 * @export
 * @class FileWindow
 * @extends {JWF.FrameWindow}
 */
export class FileWindow extends JWF.FrameWindow {
  dirTree: DirView;
  manager: AppManager;
  fileView: FileView;
  fileModule: FileModule;

  public constructor(manager: AppManager) {
    super();

    this.manager = manager;
    const fileModule = manager.getModule(FileModule);
    this.fileModule = fileModule;

    this.setTitle("ファイルマネージャー");
    this.setSize(800, 400);

    //分割バーの設定
    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(250);

    const dirTree = new DirView(fileModule);
    splitter.addChild(0, dirTree, "client");
    this.dirTree = dirTree;
    dirTree.getTree().addEventListener("itemSelect", () => {
      fileView.loadFiles(dirTree.getDirId());
    });

    const fileView = new FileView(fileModule);
    this.fileView = fileView;
    splitter.addChild(1, fileView, "client");
    fileView.addEventListener(
      "selectDir",
      (parentId): void => {
        dirTree.selectDir(parentId as number);
      }
    );
  }
}
