import { ParamsModule } from "../../modules/ParamsModule";
import { ContentsModule} from "../../modules/ContentsModule";
import { appManager } from "../../AppManager";

declare var adsbygoogle:unknown;
declare interface Window{
  adsbygoogle:{}[];
}
declare var window:Window;

const paramsModule = appManager.getModule(ParamsModule);

//パラメータの読み出し
let adSenseValue:{top:string,bottom:string}|null = null;
const loadAdParam = async ()=>{
 adSenseValue = (await paramsModule.getGlobalParam("ADSENSE_DATA")) as typeof adSenseValue;
}
loadAdParam();

//コンテンツモジュールに割り込み設定
const contentsModule = appManager.getModule(ContentsModule);
contentsModule.addEventListener("drawContents", (client,id) => {

  if(adSenseValue){
    const top = adSenseValue.top;
    if(top){
      const v = document.createElement("div");
      v.innerHTML = top;
      client.appendChild(v);
    }

    setTimeout(function(){
		try {
			(adsbygoogle = window.adsbygoogle || []).push({});
		} catch (e) {
      //empty
     }
	},10);
  }
});