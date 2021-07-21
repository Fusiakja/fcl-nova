/// <reference lib="webworker" />



import { WASI } from '@wasmer/wasi';
import browserBindings from '@wasmer/wasi/lib/bindings/browser';
import { WasmFs } from '@wasmer/wasmfs';
import { lowerI64Imports } from "@wasmer/wasm-transformer";



addEventListener('message', ({ data }) => {
  console.log("Path Ok");

})