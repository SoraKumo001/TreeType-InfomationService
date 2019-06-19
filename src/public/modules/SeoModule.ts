import { AppModule } from "../AppModule";
import { AppManager } from "../AppManager";
import { TreeItem } from "javascript-window-framework";

export class SeoModule extends AppModule {
  public constructor(manager: AppManager) {
    super(manager);

    //パンくずリスト作成
    const breadcrumbList = document.createElement("script");
    breadcrumbList.type = "application/ld+json";
    const breadcrumbValue = {
      "@context": "http://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: []
    };
    breadcrumbList.src = JSON.stringify(breadcrumbValue);
    document.head.appendChild(breadcrumbList);
  }

  public setBreadcrumb(items: { name: string; value: number }[]) {
    var url = location.href.replace(/\?.*$/, "");
    var list = [];
    for (const item of items) {
      const bradcrumb = {
        "@type": "ListItem",
        position: 1,
        item: {
          "@id": url + "?p=" + item.value,
          name: item.name
        }
      };
      list.unshift(bradcrumb);
    }
    for (var i = 0; i < list.length; i++) {
      list[i].position = i + 1;
    }
    var breadcrumbList = document.head.querySelector(
      "script[type='application/ld+json']"
    );
    if (breadcrumbList) {
      const breadcrumbValue = {
        "@context": "http://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: list
      };
      breadcrumbList.textContent = JSON.stringify(breadcrumbValue);
    }
  }
}
