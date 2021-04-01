import { Component } from '@angular/core';
import { ApiService } from "./api.service";
import * as dataForge from 'data-forge';
import { WASI } from '@wasmer/wasi';
import browserBindings from '@wasmer/wasi/lib/bindings/browser';
import { WasmFs } from '@wasmer/wasmfs';
import * as XLSX from 'xlsx';
import * as Turf from "@turf/turf";
import date from 'date-and-time';
import { FormControl } from "@angular/forms";



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'nova';

  //Vars for data read
  file: any;
  cases: any;
  products: any;
  geojson:any;
  helpExipiary: any;
  population: any;
  distancematrixmode: string = "centroid";
  distancematrix: any;
  fontStyleControl = new FormControl();
  fontStyle?: string;
  // Parameter for the Norwegian Model
  defaultdurability = 7;
  cutoff = 500;
  afterconsume = 0.1;	//#Proportion of durability after durability date things are assumed to be consumed 
  incubationmax = 4;	//#Longest potential incubation time (days) between consumption  and being registered as sick
  incubationmin = 1;	//#Shortest potential incubation time (days) between consumption  and being registered as sick
  epsilon = 100;	//#Constant for multiplying zeroes in likelihood calkulations 
  //output.filename=paste0(Casedata,".V3-Div.")	#Name stem for output pdf plots that will be put in output folder defined earlier
  unselectrandom = false	//#If "F" cases are run in the order they appear as IDNR to simulate repeated runs over an outbreak. If T random are unselected to simulate random missing.
  mincases = 5;	//#Minimum cases at which to start model
  nrplots = 5;	//#Number of plots to make from mincases to all cases

  constructor(private api: ApiService){   
  }



  //Get Geodata from Eurostat (LAU2)
  handleFileInput() {
    console.log("GO");
    
    this.api.getLAU().subscribe(x => {
      this.geojson = dataForge.fromObject(x["features"]);
      this.geojson = this.geojson.toArray();

      console.log("GeoJSON", this.geojson);
    })

    this.api.getPopulation().subscribe(
      x => {
        console.log("Population", x);
        this.population = dataForge.fromJSON(JSON.stringify(x));

      }
    )
  }


  calculateDistanceMatrix(){
    
    let centers = [];

    if (this.distancematrixmode == "centerofmass") {

      console.log("Mass");
      this.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes("NO")) {
        let ob = {LAU: element["Value"]["properties"]["GISCO_ID"], center: Turf.centerOfMass(element["Value"]["geometry"]), area: Turf.area(element["Value"]["geometry"]) };
        centers.push(ob);
        }
      });
      
    } else {
      
      console.log("centrod");
      this.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes("NO")) {
        let ob = {LAU: element["Value"]["properties"]["GISCO_ID"], center: Turf.centroid(element["Value"]["geometry"]), area: Turf.area(element["Value"]["geometry"]) };
        centers.push(ob);
        }
      });
      
    }

    console.log("Centers", centers);

    let distancematrix = [];
    centers.forEach(e1 => {
      let distancematrixrow = [];
      centers.forEach(e2 => {
        let x = Turf.distance(e1["center"], e2["center"])
        distancematrixrow.push({lau: e2["LAU"], distance: x});
      });
      distancematrix.push({lau: e1["LAU"], area: e1["area"], distances: distancematrixrow});
    });
    
    console.log("Matrix", distancematrix);
    this.distancematrix = distancematrix;
  }

  //Read Case file
  handleCaseInput(e:any) {
    this.file = e.target.files[0];
    this.handleFileInput();
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.cases = event.target.result;
      this.cases = dataForge.fromJSON(this.cases)  
      
    });
    reader.readAsText(this.file);
  }

  //Read Product file
  handleProductInput(e:any) {
    this.file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.products = event.target.result;
      this.products = dataForge.fromCSV(this.products);
      console.log("products", this.products);
      
    });
    reader.readAsText(this.file);

  }

  //Read file containing the days until a product expiers
  handleHelpExpiaryInput(e:any) {
    this.file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.helpExipiary = event.target.result;
      this.helpExipiary = dataForge.fromCSV(this.helpExipiary);
      console.log("help", this.helpExipiary);
      
    });
    reader.readAsText(this.file);
  }

  //Preprocessing data

  wasmFilePath:any;
  echoStr:any;
  wasmFs:any;
  wasi: any;
  runWasi() {
    console.log("WASI WASI");

    // Parse files to Array
    this.helpExipiary = this.helpExipiary.toArray();
    console.log("Help", this.helpExipiary);
    
    this.products = this.products.toArray();
    this.products.forEach(element => {
      element["deliverydate"] = date.transform(element["deliverydate"], "YYYYMMDD", 'YYYY-MM-DD');
    });
    console.log("Prod", this.products);

    this.cases = this.cases.toArray();
    this.cases.forEach(element => {
      element["dateofinfection"] = date.transform(element["dateofinfection"], "DD.MM.YYYY", 'YYYY-MM-DD');
    });
    console.log("Cases", this.cases);

    this.calculateDistanceMatrix();

    let newpop = [];
    this.population.forEach(element => {
      if (element["country"] === "NO") {
        newpop.push(element);
      }
    });

    console.log(newpop);

    let populationdensity = [];
    newpop.forEach(e1 => {      
      this.distancematrix.forEach(e2 => {        
        if (e1["giscoid"].includes(e2["lau"])) {
          e2["populationdensity"] = Number.parseFloat(e1["population"])/Number.parseInt(e2["area"]);
          populationdensity.push(e2);          
        }
      });
    });
    
    console.log("Density", populationdensity);


    this.wasmFilePath = '../assets/rustynova2.wasm'  // Path to our WASI module
    this.echoStr      = 'This assembly'    // Text string to echo
    this.wasmFs = new WasmFs()
    
    this.wasi = new WASI({
      // Arguments passed to the Wasm Module
      // The first argument is usually the filepath to the executable WASI module
      // we want to run.
      args: [this.wasmFilePath, JSON.stringify(this.cases), JSON.stringify(this.products), JSON.stringify(this.helpExipiary), JSON.stringify(populationdensity), this.incubationmax, this.incubationmin],
    
      // Environment variables that are accesible to the WASI module
      env: {},
    
      // Bindings that are used by the WASI Instance (fs, path, etc...)
      bindings: {
        ...browserBindings,
        fs: this.wasmFs.fs
      }
    })

    this.startWasiTask(this.wasmFilePath).then(x => {
      console.log("X", x);
    });
    
}



async startWasiTask(pathToWasmFile: string) {
  // Fetch our Wasm File
  let response  = await fetch(pathToWasmFile)
  let wasmBytes = new Uint8Array(await response.arrayBuffer())

  // IMPORTANT:
  // Some WASI module interfaces use datatypes that cannot yet be transferred
  // between environments (for example, you can't yet send a JavaScript BigInt
  // to a WebAssembly i64).  Therefore, the interface to such modules has to
  // be transformed using `@wasmer/wasm-transformer`, which we will cover in
  // a later example

  // Instantiate the WebAssembly file
  let wasmModule = await WebAssembly.compile(wasmBytes);
  let instance = await WebAssembly.instantiate(wasmModule, {
     ...this.wasi.getImports(wasmModule)
  });

  this.wasi.start(instance)                      // Start the WASI instance
  let stdout = await this.wasmFs.getStdOut()     // Get the contents of stdout
  return String(stdout);// Write stdout data to the DOM
}
  
}
