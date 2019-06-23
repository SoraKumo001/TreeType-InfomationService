/**
 *config用コントロールパラメータ
 *
 * @interface ControlParameter
 */
declare interface ControlParameter {
  groups?: string | string[];
  send_to?: string | string[];
  event_callback?: () => void;
  event_timeout?: number;
}
/**
 *config用ページビューパラメータ
 *
 * @interface PageViewParameter
 */
declare interface PageViewParameter {
  send_page_view?: boolean;
  groups?: string;
  page_title?: string;
  page_location?: string;
  page_path?: string;
}

/**
 *event用推奨パラメータ
 *
 * @interface DefaultEventParameter
 */
declare interface DefaultEventParameter {
  checkout_option?: string;
  checkout_step?: number;
  content_id?: string;
  content_type?: string;
  coupon?: string;
  currency?: string;
  description?: string;
  fatal?: boolean;
  items?: {
    brand: string;
    category: string;
    creative_name: string;
    creative_slot: string;
    id: string;
    location_id: string;
    name: string;
    price: number;
    quantity: string;
  }[];
  method?: string;
  name?: string;
  promotions?: {
    creative_name: string;
    creative_slot: string;
    id: string;
    name: string;
  }[];
  screen_name?: string;
  search_term?: string;
  shipping?: number;
  tax?: number;
  transaction_id?: string;
  value?: number;
  app_name?: string;
  app_id?: string;
  app_version?: string;
  app_installer_id?: string;
}

/**
 *event用推奨イベント
 *
 * @interface DefaultEvent
 */
declare interface DefaultEvent {
  add_payment_info?: undefined;
  add_to_cart?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    items?: DefaultEventParameter["items"];
  };
  add_to_wishlist?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    items?: DefaultEventParameter["items"];
  };
  begin_checkout?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    items?: DefaultEventParameter["items"];
    coupon?: DefaultEventParameter["coupon"];
  };
  checkout_progress?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    items?: DefaultEventParameter["items"];
    coupon?: DefaultEventParameter["coupon"];
    checkout_step?: DefaultEventParameter["checkout_step"];
    checkout_option?: DefaultEventParameter["checkout_option"];
  };
  exception?: {
    description?: DefaultEventParameter["description"];
    fatal?: DefaultEventParameter["fatal"];
  };
  generate_lead?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    transaction_id?: DefaultEventParameter["transaction_id"];
  };
  login?: {
    method?: DefaultEventParameter["method"];
  };
  page_view?: undefined;
  purchase?: {
    transaction_id?: DefaultEventParameter["transaction_id"];
    value?: DefaultEventParameter["value"];
    tax?: DefaultEventParameter["tax"];
    shipping?: DefaultEventParameter["shipping"];
    items?: DefaultEventParameter["items"];
    coupon?: DefaultEventParameter["coupon"];
  };
  refund?: {
    transaction_id?: DefaultEventParameter["transaction_id"];
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    tax?: DefaultEventParameter["tax"];
    shipping?: DefaultEventParameter["shipping"];
    items?: DefaultEventParameter["items"];
  };
  remove_from_cart?: {
    value?: DefaultEventParameter["value"];
    currency?: DefaultEventParameter["currency"];
    items?: DefaultEventParameter["items"];
  };
  screen_view?: {
    screen_name?: DefaultEventParameter["screen_name"];
    app_name?: DefaultEventParameter["app_name"];
    app_id?: DefaultEventParameter["app_id"];
    app_version?: DefaultEventParameter["app_version"];
    app_installer_id?: DefaultEventParameter["app_installer_id"];
  };
  search?: {
    search_term?: DefaultEventParameter["search_term"];
  };
  select_content?: {
    items?: DefaultEventParameter["items"];
    promotions?: DefaultEventParameter["promotions"];
    content_type?: DefaultEventParameter["content_type"];
    content_id?: DefaultEventParameter["content_id"];
  };
  set_checkout_option?: {
    checkout_step?: DefaultEventParameter["checkout_step"];
    checkout_option?: DefaultEventParameter["checkout_option"];
  };
  share?: {
    method?: DefaultEventParameter["method"];
    content_type?: DefaultEventParameter["content_type"];
    content_id?: DefaultEventParameter["content_id"];
  };
  sign_up?: {
    method?: DefaultEventParameter["method"];
  };
  timing_complete?: {
    name?: DefaultEventParameter["name"];
    value?: DefaultEventParameter["value"];
  };
  view_item?: {
    items?: DefaultEventParameter["items"];
  };
  view_item_list?: {
    items?: DefaultEventParameter["items"];
  };
  view_promotion?: {
    promotions?: DefaultEventParameter["promotions"];
  };
  view_search_results?: {
    search_term?: DefaultEventParameter["search_term"];
  };
}


/**
 *event用通常パラメータ
 *
 * @interface EventParameter
 */
declare interface EventParameter {
  event_category?: string;
  event_label?: string;
  value?: number;
  non_interaction?: boolean;
}

/**
 *gtag定義
 *
 * @template K
 * @param {(...["config", string, (ControlParameter|PageViewParameter|DefaultEventParameter)?]
 *     | ["set", { [key: string]: string }]
 *     | ["event", K, (DefaultEvent[K] & EventParameter)]
 *     | ["event", Exclude<string, K>, EventParameter?])} params
 */


declare function gtag<K extends keyof DefaultEvent>(
    ...params:
      | ["config", string, (ControlParameter|PageViewParameter|DefaultEventParameter)?]
      | ["set", { [key: string]: string }]
      | ["event", K, (DefaultEvent[K] & EventParameter)]
      | ["event", Exclude<string, K>, EventParameter?]
  ): void;
