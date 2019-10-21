# ts-method-checker

Check typescript method arguments and return types during execution

## usage

It is necessary to specify the following contents in the settings of tsconfig.json

```tsconfig.json
{
  "compilerOptions": {
   "experimentalDecorators": true,
   "emitDecoratorMetadata": true
  }
}
```

Specify **@CHECK** for a method that requires type checking at runtime

```ts
import {CHECK} from 'ts-method-checker';

class Test {
  @CHECK //this will check arguments and return types at runtime
  func01(a: number, b: string, c: boolean): number {
    console.log(a, b, c);
    return 0;
  }
  @CHECK
  func02(a: number, b: string, c: boolean): number {
    console.log(a, b, c);
    return "A" as never; //Set the return value to string type
  }
}
```

If an invalid type is used in the program, an exception will be raised

```ts
// Create instance
const test = new Test();

//do it right
test.func01(0, "A", true);  //OK

//Incorrect number of arguments
try {
  (test.func01 as any)(true); //exception "Invalid number of arguments"
} catch (e) {
  console.error(e);
}

//Incorrect argument type
try {
  (test.func01 as any)(0, 10, true); //exception "Invalid argument type"
} catch (e) {
  console.error(e);
}

//Call the method with the wrong return value
try {
  test.func02(0, "A", true); //exception "Invalid return type"
} catch (e) {
  console.error(e);
}
```

## Judgable type

- number
- string
- boolean
- Array
- Function

Only simple types above can be determined
Anything else that cannot be judged is ignored

## license

MIT
