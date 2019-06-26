import { FrameWindow } from "javascript-window-framework";
import "./scss/ContentsControleWindow.scss";
export class ContentsControleWindow extends FrameWindow {
  public constructor() {
    super();
    this.setTitle("コンテンツ設定");
    this.setJwfStyle("ContentsControleWindow");
    this.setSize(200, 350);
    this.foreground();

    this.addEventListener("active",(e)=>{
      if(!e.active)
        this.close();
    })
  }
  public addMenu(name: string,event?:()=>void) {
    const div = document.createElement("div");
    div.innerText = name;
    if(event)
      div.addEventListener('click',event)
    this.getClient().appendChild(div);
  }
}
