/**
 *更新リスト表示用プラグイン
  */
import {
  TreeContents,
  MainContents,
  ContentsModule
} from "../../Contents/ContentsModule";
import { sprintf } from "@jswf/core";
import { ContentsCacheModule } from "./ContentsCache.auto";
import { getManager } from "../..";

const contentsModule = getManager().getModule(ContentsModule);
const contentsCacheModule = getManager().getModule(ContentsCacheModule);

function getContentsList(
  treeContents: TreeContents,
  list?: (typeof treeContents)[]
) {
  if (!list) list = [];
  const childs = treeContents.children;
  if (childs) {
    for (const child of childs) {
      getContentsList(child, list);
    }
  }
  //ページのみ保存
  if(treeContents.type === 'PAGE')
    list.push(treeContents);
  return list;
}
/**
 *更新履歴表示用
 */

function contentsUpdate(
  body: HTMLDivElement,
  uuid: string,
  contents: MainContents
) {
  body.innerHTML = contents["value"];
  const tree = contentsCacheModule.findTreeContents(uuid);
  if (!tree) {
    return;
  }
  const list = getContentsList(tree);
  list.sort((a, b) => {
    if(a.pageNew && b.pageNew)
      return b.pageNew.date.getTime() - a.pageNew.date.getTime();
    return 0;
  });
  const table = document.createElement("table");
  table.dataset.type = "UpdateTable";
  for (let i = 0; list[i] && i < 10; i++) {
    const t = list[i];
    if(t.uuid === uuid)
      continue;
    const row = table.insertRow();

    //クリックイベントの作成
    row.addEventListener("click", () => {
      contentsModule.selectContents(t.uuid);
    });

    let cell: HTMLTableCellElement;

    //日付の作成
    const pageNew = t.pageNew;
    const date = pageNew?pageNew.date:t.date;
    const d = sprintf(
      "%04d/%02d/%02d %02d:%02d",
      date.getFullYear(),
      date.getMonth()+1,
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    );
    //日付の設定
    cell = row.insertCell();
    cell.innerText = d;

    //タイトルの設定
    cell = row.insertCell();
    let p: typeof t | undefined = pageNew||t;
    do {
      if (p.uuid === uuid) break;
      const title = document.createElement("span");
      title.innerText = p.title;
      cell.insertBefore(title,cell.firstChild);
    } while ((p = p.parent));
  }
  body.appendChild(table);
}

contentsModule.addContentsValueType("UPDATE", contentsUpdate);
