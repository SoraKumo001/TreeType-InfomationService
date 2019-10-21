import "reflect-metadata"; //npmから追加インストールの必要あり

//型のチェック
function isType(type: object, value: unknown) {
  switch (type) {
    case Number:
      if (typeof value !== "number") return false;
      break;
    case String:
      if (typeof value !== "string") return false;
      break;
    case Boolean:
      if (typeof value !== "boolean") return false;
      break;
    case Array:
      if (!(value instanceof Array)) return false;
      break;
    case Function:
      if (!(value instanceof Function)) return false;
      break;
  }
  return true;
}
//型チェック用デコレータ
export function CHECK(target: any, name: string, descriptor: PropertyDescriptor) {
  const ptypes = Reflect.getMetadata(
    "design:paramtypes",
    target,
    name
  ) as object[];
  const rtype = Reflect.getMetadata(
    "design:returntype",
    target,
    name
  ) as object[];
  return {
    ...descriptor,
    value: function(...params: unknown[]) {
      if (ptypes.length !== params.length) throw "Invalid number of arguments";
      const flag = ptypes.reduce((a, b, index) => {
        return a && isType(b, params[index]);
      }, true);
      if (!flag) {
        throw "Invalid argument type";
      }
      const result = descriptor.value.apply(this, params);
      if (!isType(rtype, result)) throw "Invalid return type";
      return result;
    }
  };
}