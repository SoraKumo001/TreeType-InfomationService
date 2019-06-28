/**
 *更新リスト表示用プラグイン
  */
import {
  TreeContents,
  MainContents,
  ContentsModule
} from "../../modules/ContentsModule";
import { sprintf } from "javascript-window-framework";
import { appManager } from "../../AppManager";

const contentsModule = appManager.getModule(ContentsModule) as ContentsModule;

function getContentsList(
  treeContents: TreeContents & { parent?: TreeContents },
  list?: (typeof treeContents)[]
) {
  if (!list) list = [];
  list.push(treeContents);
  const childs = treeContents.childs;
  if (childs) {
    for (const child of childs) {
      (child as typeof treeContents).parent = treeContents;
      getContentsList(child, list);
    }
  }
  return list;
}
/**
 *更新履歴表示用
 */

function contentsUpdate(
  body: HTMLDivElement,
  pageId: number,
  contents: MainContents
) {
  body.innerHTML = contents["value"];
  const tree = contentsModule.findTreeContents(pageId);
  if (!tree) {
    return;
  }
  const list = getContentsList(tree);
  list.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const table = document.createElement("table");
  table.dataset.type = "UpdateTable";
  for (let i = 0; list[i] && i < 10; i++) {
    const t = list[i];
    if(t.id === pageId)
      continue;
    const row = table.insertRow();

    //クリックイベントの作成
    row.addEventListener("click", () => {
      contentsModule.selectContents(t.id);
    });

    let cell: HTMLTableCellElement;

    //日付の作成
    const date = new Date(list[i].date);
    const d = sprintf(
      "%04d/%02d/%02d %02d:%02d",
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    );
    //日付の設定
    cell = row.insertCell();
    cell.innerText = d;

    //タイトルの設定
    cell = row.insertCell();
    let p: typeof t | undefined = t;
    do {
      if (p.id === pageId) break;
      const title = document.createElement("span");
      title.innerText = p.title;
      cell.appendChild(title);
    } while ((p = p.parent));
  }
  body.appendChild(table);
}

contentsModule.addContentsValueType("UPDATE", contentsUpdate);
