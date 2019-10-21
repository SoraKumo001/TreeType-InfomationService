import "reflect-metadata";
export declare function CHECK(target: any, name: string, descriptor: PropertyDescriptor): {
    value: (...params: unknown[]) => any;
    configurable?: boolean | undefined;
    enumerable?: boolean | undefined;
    writable?: boolean | undefined;
    get?(): any;
    set?(v: any): void;
};
