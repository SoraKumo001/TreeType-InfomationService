import * as JWF from "javascript-window-framework";
import { TopMenu } from "./TopMenu";
import { AppManager } from "../AppManager";
import { ContentsModule, TreeContents } from "../modules/ContentsModule";
import { TreeItem } from "javascript-window-framework";

class InfoTreeView extends JWF.TreeView{
  private contentsModule:ContentsModule
  public constructor(manager:AppManager){
    super();
    this.contentsModule = manager.getModule(ContentsModule);
    this.loadTree();
  }
  public async loadTree(){
    this.clearItem();
    const value = await this.contentsModule.getTree();
    if(value)
  		this.setTreeItem(this.getRootItem(), value);
  }
  private setTreeItem(item:TreeItem,value:TreeContents){
    const node = item.getNode();
    item.setItemText(value.title);
    item.setItemValue(value.id);
    node.dataset.contentStat = value.stat?"true":"false";
    node.dataset.contentType = value["type"] === "PAGE" ? "PAGE" : "TEXT";
    if (value.childs) {
			var flag = node.dataset.contentType!=='PAGE';
			for (var i = 0; value.childs[i]; i++) {
				var child = value.childs[i];
				if (/*Contents.visible || */child["stat"])
					this.setTreeItem(item.addItem("", flag), child);
			}
		}
  }
}
class InfoView extends JWF.Window{
  constructor(manager:AppManager){
    super();
  }
}

export class MainView extends JWF.Window{
  constructor(manager:AppManager){
    super({overlap:true});
    this.setMaximize(true);

    this.addChild(new TopMenu(manager),"bottom");

    const splitter = new JWF.Splitter();
    this.addChild(splitter,"client");
    splitter.setSplitterPos(250);

    splitter.addChild(0,new InfoTreeView(manager),"client");
    splitter.addChild(1,new InfoView(manager),"client");

  }
}