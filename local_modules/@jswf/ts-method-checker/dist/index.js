"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata"); //npmから追加インストールの必要あり
//型のチェック
function isType(type, value) {
    switch (type) {
        case Number:
            if (typeof value !== "number")
                return false;
            break;
        case String:
            if (typeof value !== "string")
                return false;
            break;
        case Boolean:
            if (typeof value !== "boolean")
                return false;
            break;
        case Array:
            if (!(value instanceof Array))
                return false;
            break;
        case Function:
            if (!(value instanceof Function))
                return false;
            break;
    }
    return true;
}
//型チェック用デコレータ
function CHECK(target, name, descriptor) {
    var ptypes = Reflect.getMetadata("design:paramtypes", target, name);
    var rtype = Reflect.getMetadata("design:returntype", target, name);
    return __assign(__assign({}, descriptor), { value: function () {
            var params = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                params[_i] = arguments[_i];
            }
            if (ptypes.length !== params.length)
                throw "Invalid number of arguments";
            var flag = ptypes.reduce(function (a, b, index) {
                return a && isType(b, params[index]);
            }, true);
            if (!flag) {
                throw "Invalid argument type";
            }
            var result = descriptor.value.apply(this, params);
            if (!isType(rtype, result))
                throw "Invalid return type";
            return result;
        } });
}
exports.CHECK = CHECK;
//# sourceMappingURL=index.js.map