// 1. Inline Exports (Const, Let, Var)
export const PI = 3.14159;
export let mutableVar = 42;

// 2. Inline Function and Class Exports
export function add(a, b) {
    return a + b;
}

export class Calculator {
    multiply(a, b) { return a * b; }
}

// 3. Named Block Exports & Aliasing
const subtract = (a, b) => a - b;
const divide = (a, b) => a / b;
export { subtract, divide as safeDivide };

// 4. Default Export
export default function defaultFunction() {
    return "default-value";
}
