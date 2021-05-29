/// <reference lib="webworker" />
import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
//import wasiBindings from "@wasmer/wasi/lib/bindings/browser";

//import date from 'date-and-time';


addEventListener('message', ({ data }) => {
  const wasmFilePath = '../assets/rustynova2.wasm'  // Path to our WASI module
console.log("Path Ok");

// Instantiate new WASI and WasmFs Instances
// IMPORTANT:
// Instantiating WasmFs is only needed when running in a browser.
// When running on the server, NodeJS's native FS module is assigned by default
const wasmFs = new WasmFs()
console.log("WASMFS OK");


let wasi = new WASI({
  // Arguments passed to the Wasm Module
  // The first argument is usually the filepath to the executable WASI module
  // we want to run.
  args: [wasmFilePath, data],

  // Environment variables that are accesible to the WASI module
  env: {},

  // Bindings that are used by the WASI Instance (fs, path, etc...)
  bindings: {
 // @ts-ignore
 ...WASI.defaultBindings,
 fs: wasmFs.fs
}
})
console.log("WASI OK");

  startWasiTask(wasmFilePath, wasi, wasmFs).then(
    x => {
      console.log("OK", x);
      
      postMessage(x);
    }
  )
});


async function startWasiTask(pathToWasmFile: string, wasi, wasmFs) {
  // Fetch our Wasm File
  let response  = await fetch(pathToWasmFile);
  console.log("FETCH OK");
  
  let wasmBytes = new Uint8Array(await response.arrayBuffer());
  console.log("BYTES OK");
  

  // IMPORTANT:
  // Some WASI module interfaces use datatypes that cannot yet be transferred
  // between environments (for example, you can't yet send a JavaScript BigInt
  // to a WebAssembly i64).  Therefore, the interface to such modules has to
  // be transformed using `@wasmer/wasm-transformer`, which we will cover in
  // a later example

  // Instantiate the WebAssembly file
  let wasmModule = await WebAssembly.compile(wasmBytes);
  let instance = await WebAssembly.instantiate(wasmModule, {
     ...wasi.getImports(wasmModule)
  });

  this.wasi.start(instance)                      // Start the WASI instance
  let stdout = await wasmFs.getStdOut()     // Get the contents of stdout
  return String(stdout);// Write stdout data to the DOM
}