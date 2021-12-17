/// <reference lib="webworker" />

import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
import { lowerI64Imports } from "@wasmer/wasm-transformer";


addEventListener('message', ({ data }) => {


let wasmFilePath;
let echoStr;
let wasmFs;
let wasi;

wasmFilePath = './assets/rustynova2.wasm'  // Path to our WASI module
echoStr      = 'data assembly'    // Text string to echo
wasmFs = new WasmFs()
              
wasi = new WASI({
  // Arguments passed to the Wasm Module
  // The first argument is usually the filepath to the executable WASI module
  // we want to run.
  //args: [data.wasmFilePath, JSON.stringify(casesaggregated), JSON.stringify(data.products), JSON.stringify(data.helpExipiary), JSON.stringify(populationdensity), data.incubationmax, data.incubationmin],
  args: [wasmFilePath, JSON.stringify(data.casesaggregated), JSON.stringify(data.products), JSON.stringify(data.helpExipiary), JSON.stringify(data.populationdensity), data.incubationmax, data.incubationmin, data.cutoff, data.holdbar, data.afterconsume],

  // Environment variables that are accesible to the WASI module
  env: {},
             
  // Bindings that are used by the WASI Instance (fs, path, etc...)
  bindings: {
  ...WASI.defaultBindings,
  fs: wasmFs.fs
    }
  });


const startWasiTask = async () => {
  // Fetch our Wasm File
  const response = await fetch(wasmFilePath);
  const responseArrayBuffer = await response.arrayBuffer();
  const wasmBytes = new Uint8Array(responseArrayBuffer);

  // Lower the WebAssembly Module bytes
  // This will create trampoline functions for i64 parameters
  // in function calls like: 
  // https://github.com/WebAssembly/WASI/blob/master/phases/old/snapshot_0/docs/wasi_unstable.md#clock_time_get
  // Allowing the Wasi module to work in the browser / node!
  const loweredWasmBytes = await lowerI64Imports(wasmBytes);

  // Instantiate the WebAssembly file
  let wasmModule = await WebAssembly.compile(wasmBytes);
  let instance = await WebAssembly.instantiate(wasmModule, {
    ...wasi.getImports(wasmModule)
  });
  // Start the WebAssembly WASI instance!
  try {
    wasi.start(instance);
  } catch(e) {
    // Catch errors, and if it is not a forced user error (User cancelled the prompt)
    // Log the error and end the process
    if (!e.user) {
      console.error(e);
      return;
    } 
  }

  // User cancelled the prompt!

  // Output what's inside of /dev/stdout!
  let stdout = await wasmFs.getStdOut();

  // Add the Standard output to the dom
  //console.log('Standard Output: ' + stdout);
  postMessage(stdout);
};
startWasiTask();
  
})