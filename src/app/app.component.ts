import { Component, NgZone } from '@angular/core';
import { ApiService } from "./api.service";
import * as dataForge from 'data-forge';
import { WASI } from '@wasmer/wasi';
import browserBindings from '@wasmer/wasi/lib/bindings/browser';
import { WasmFs } from '@wasmer/wasmfs';
import * as XLSX from 'xlsx';
import * as Turf from "@turf/turf";
import date from 'date-and-time';
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import * as L from 'leaflet';
import { tileLayer } from 'leaflet'; 
import 'leaflet-providers';
import { MatStepper } from '@angular/material/stepper';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { saveAs } from 'file-saver';




export interface CaseElement {
  zip: number;
  pathogen: number;
  municipality: number;
  dateofinfection: string;
}

export interface ProductElement {
  product: string
}

export interface DurabilityElement {
  productnumber: number,
  variant: number,
  name: string,
  durability:number
}

export interface ResultElement {
  productnumber: number,
  variant: number,
  name: string
}

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
  countryGeoJson: any;
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
  unselectrandom = false;	//#If "F" cases are run in the order they appear as IDNR to simulate repeated runs over an outbreak. If T random are unselected to simulate random missing.
  mincases = 5;	//#Minimum cases at which to start model
  nrplots = 5;	//#Number of plots to make from mincases to all cases
  postalcodes: any;
  //options for leaflet
  options = {
    layers: [
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "..."
      })
    ],
    zoom: 4,
    center: L.latLng(0, 0),
  };
  layers = [];
  layersControl: any;
  fitBounds = [[50, 0], [80, 25]];
  regions = [];
  center = [0, 0];
  clicked = '';
  jsonMap;

  private map;

  //Stepper
  isLinear = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  thirdFormGroup: FormGroup;
  forthFromGroup: FormGroup;
  //UI variables
  stepIndex = 0;
  // case table
  displayedColumns: string[] = ['select', 'position', 'name', 'weight', 'symbol'];
  dataSource = new MatTableDataSource<CaseElement>();
  selection = new SelectionModel<CaseElement>(true, []);

  //product table
  productsGrouped: any;
  displayedColumnsProducts: string[] = ['select', 'product'];
  dataSourceProduct = new MatTableDataSource<ProductElement>();
  selectionProduct = new SelectionModel<ProductElement>(true, []);

    // case table
  displayedColumnsDurability: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSourceDurability = new MatTableDataSource<DurabilityElement>();
  selectionDurability = new SelectionModel<DurabilityElement>(true, []);
  
      // case table
      displayedColumnsResult: string[] = ['position', 'name', 'weight'];
      dataSourceResult = new MatTableDataSource<ResultElement>();
  
  // spinner
  loading: boolean = false;
  afterloading: boolean = false;
  message: string = "Fetching data from the web. Please wait.";
  start: boolean = false;
  country: string = "NO";
  countryarray = ['ES', 'DK', 'IT', 'LU', 'PT', 'CZ', 'EE', 'NL', 'CH', 'IS', 'NO',
  'DE', 'AT', 'BE', 'SI', 'SK', 'PL', 'FR', 'RO', 'IE', 'FI', 'CY',
  'RS', 'EL', 'UK', 'BG', 'SE', 'MT', 'HR', 'HU', 'LT', 'LV', 'TR'];
  post;

  //Calculation Result
  calculationResult;
  



  constructor(private api: ApiService, private zone: NgZone, private _formBuilder: FormBuilder){   

  }


  onStart() {
    this.loading = true;
    this.afterloading = true;
    console.log(this.country);
    
    this.api.getLAU().subscribe(
      (x: any) => {

      this.handleFileInput();
      this.geojson = dataForge.fromObject(x["features"]);
      this.geojson = this.geojson.toArray();

        this.api.getPopulation().subscribe(pop => {

          this.population = pop;
          let laus = x;
          let y = [];
          let popDE = [];
          let pos: any = Array.of(pop)[0];
          console.log("pop", Array.of(pop)[0]);
          console.log("pos", pos);
          console.log("laus", laus);
          
          for (let index = 0; index < pos.length; index++) {

            if (pos[index]["giscoid"].includes(this.country)) {
              popDE.push(pos[index]);
            }

          }

          function getColor(d) {
            return d > 1000 ? '#800026' :
              d > 500 ? '#BD0026' :
                d > 200 ? '#E31A1C' :
                  d > 100 ? '#FC4E2A' :
                    d > 50 ? '#FD8D3C' :
                      d > 20 ? '#FEB24C' :
                        d > 10 ? '#FED976' :
                          '#FFEDA0';
          }

          console.log("pope", popDE);
          

          for (let index = 0; index < x["features"].length; index++) {
            if (x["features"][index]["properties"]["CNTR_CODE"].includes(this.country)) {
              y.push(x["features"][index]);
            }
          }

          for (let index = 0; index < y.length; index++) {
            for (let i = 0; i < popDE.length; i++) {
              if (popDE[i]["giscoid"].includes(y[index]["properties"]["GISCO_ID"])) {
                y[index]["properties"]["density"] = popDE[i]["population"] / Turf.area(y[index]["geometry"]) * 10000000;
                delete y[index]["properties"]["POP_2019"];
                delete y[index]["properties"]["POP_DENS_2019"];
                delete y[index]["properties"]["AREA_KM2"];
                delete y[index]["properties"]["YEAR"];
              }
            }
          }


          console.log("Y", y);

          laus["features"] = y;
          console.log("LA0", laus);

          this.countryGeoJson = laus;
          const defaultBaseLayer= L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: "..."
          });
          let defaultOverlay = L.geoJSON(laus as any, {
            onEachFeature: this.onPopUp.bind(this),
            style: function (feature) { // Style option
              return {
                fillColor: getColor(feature.properties.density),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
              }
            }
          }
          );

          this.layers = [
            defaultBaseLayer,
            defaultOverlay
          ];

          this.layersControl = {
            baseLayers: {
              'OpenStreetMap Mapnik': defaultBaseLayer,
            },
            overlays: {
              'Norway': defaultOverlay
            }
          };

        }
        )
      }
    )
  }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      firstCtrl: ['', Validators.required]
    });
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });
    this.thirdFormGroup = this._formBuilder.group({
      thirdCtrl: ['', Validators.required]
    });
    this.forthFromGroup = this._formBuilder.group({
        defaultdurability: [7, Validators.required],
        cutoff: [500, Validators.required],
        afterconsume: [0.1, Validators.required],	//#Proportion of durability after durability date things are assumed to be consumed 
        incubationmax: [4, Validators.required],	//#Longest potential incubation time (days) between consumption  and being registered as sick
        incubationmin: [1, Validators.required],	//#Shortest potential incubation time (days) between consumption  and being registered as sick
        epsilon: [100, Validators.required],	//#Constant for multiplying zeroes in likelihood calkulations 
        //output.filename=paste0(Casedata,".V3-Div.")	#Name stem for output pdf plots that will be put in output folder defined earlier
        unselectrandom:  [false, Validators.required],	//#If "F" cases are run in the order they appear as IDNR to simulate repeated runs over an outbreak. If T random are unselected to simulate random missing.
        mincases: [5, Validators.required],	//#Minimum cases at which to start model
        nrplots: [5, Validators.required],	//#Number of plots to make from mincases to all cases}
        distancematrixmode: ["centroid", Validators.required]
  });

  }


  onMapReady(map: L.Map): void {
    setTimeout(() => {
        map.invalidateSize();
        this.map = map;
    });
  }


  onPopUp(feature, layer) {

    //let that = this;
    this.zone.run(() => {
      // push polygon names to regions array
      this.regions.push(feature.properties.name);

      layer.on('click', <LeafletMouseEvent>(e) => {
        this.zone.run(() => {
          this.fitBounds = e.target.getBounds();
          this.clicked = e.target.feature.properties.name;
        });
      });
    });
  }



  //Get Geodata from Eurostat (LAU2)
  handleFileInput() {
    console.log("GO");
    

    this.message = "Processing data. Please wait."
    this.api.getCodes().subscribe(x => {
      this.post = x;
    })

    this.api.getPostal(this.country).subscribe(x => {
      let country = [];

      JSON.parse(JSON.stringify(x)).forEach(element => {
        if (element["CNTR_ID"] == this.country) {
          country.push(element);
        }
      });
      this.postalcodes = country;
      this.start = true;
      this.loading = false;
      
    })
  }


  calculateDistanceMatrix(){

    let centers = [];

    if (this.distancematrixmode == "centerofmass") {

      console.log("Mass");
      this.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes(this.country)) {
        let ob = {LAU: element["Value"]["properties"]["GISCO_ID"], center: Turf.centerOfMass(element["Value"]["geometry"]), area: Turf.area(element["Value"]["geometry"]) };
        centers.push(ob);
        }
      });
      
    } else {
      
      console.log("centrod");
      this.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes(this.country)) {
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
    this.loading = true;
    this.file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.cases = event.target.result;
      this.cases = dataForge.fromJSON(this.cases);
      this.cases = this.cases.toArray();
      console.log(this.cases);
      
      this.dataSource = new MatTableDataSource<CaseElement>(this.cases);
      let casesGEO = [];
      this.cases.forEach(element => {
        this.countryGeoJson["features"].forEach(element2 => {

          if (element2["properties"]["LAU_ID"] == element.zip.toLowerCase()) {
            casesGEO.push(element2);
          }
          
        });
      });

      casesGEO.forEach(element => {
        let count = 0;
        casesGEO.forEach(element2 => {
          if (element["properties"]["LAU_ID"] == element2["properties"]["LAU_ID"]) {
            count++;
          }
        });
        element["properties"]["casenumbers"] = count;
      });

      console.log(casesGEO);

      function getColor(d) {
        return d > 8 ? '#081c15' :
            d > 7 ? '#1b4332' :
              d > 6 ? '#2d6a4f' :
                d > 5 ? '#40916c' :
                  d > 4 ? '#52b788' :
                    d > 3 ? '#74c69d' :
                      d > 2 ? '#95d5b2' :
                        d > 1 ? '#b7e4c7' :
                          d > 0 ? '#d8f3dc' :
                      '#FFEDA0';
      }

      let casesMap = this.countryGeoJson;
      casesMap["features"] = casesGEO;
      let defaultOverlay = L.geoJSON(casesMap as any, {
        onEachFeature: this.onPopUp.bind(this),
        style: function (feature) { // Style option
          return {
            fillColor: getColor(feature.properties.casenumbers),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
          }
        }
      });

      this.layers.push(defaultOverlay);
      this.layersControl.overlays["cases"] = defaultOverlay;
      this.masterToggle();
      this.loading = false;
    });
    reader.readAsText(this.file);
  }

  //Read Product file
  handleProductInput(e:any) {
    this.loading = true;
    this.file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.products = event.target.result;
      this.products = dataForge.fromCSV(this.products);
      this.productsGrouped = this.products.groupBy(row => row.variantname).select(group => ({ 
        product: group.first().variantname}));
      this.productsGrouped = this.productsGrouped.toArray();
      this.dataSourceProduct = new MatTableDataSource<ProductElement>(this.productsGrouped);
      /*this.productsGroupedMuni = this.products.groupBy(row => row.deliverypostcode);
        this.productsGroupedMuni = this.productsGroupedMuni.toArray();
        console.log("products", this.productsGroupedMuni);*/
      this.masterToggleProducts();
      this.loading = false;
    });
    reader.readAsText(this.file);

  }

  productsGroupedMuni;
  //Remove Products from list
  removeProducts(){    
    /*this.selectionProduct.selected.forEach(element => {
      this.products = this.products.where(row => (row["variantname"] == element["product"]))  
    });
    console.log("pro", this.products.toArray());*/
    
  }

  //Read file containing the days until a product expiers
  handleHelpExpiaryInput(e:any) {
    console.log("products", this.productsGroupedMuni);

    this.file = e.target.files[0];
    this.loading = true;
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      this.helpExipiary = event.target.result;
      this.helpExipiary = dataForge.fromCSV(this.helpExipiary);
      this.helpExipiary = this.helpExipiary.toArray();
      this.dataSourceDurability = new MatTableDataSource<DurabilityElement>(this.helpExipiary);
      console.log("help", this.helpExipiary);
      this.loading = false;
    });
    reader.readAsText(this.file);
  }

  // UI Stepper
goBack(stepper: MatStepper){
    stepper.previous();
    this.stepIndex = stepper.selectedIndex;
    console.log(this.stepIndex);
}

goForward(stepper: MatStepper){
    stepper.next();
    this.stepIndex = stepper.selectedIndex;
    console.log(this.stepIndex);
}

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.data.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: CaseElement): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.zip + 1}`;
  }

  isAllSelectedProducts() {
    const numSelected = this.selectionProduct.selected.length;
    const numRows = this.dataSourceProduct.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggleProducts() {
    this.isAllSelectedProducts() ?
        this.selectionProduct.clear() :
        this.dataSourceProduct.data.forEach(row => this.selectionProduct.select(row));
  }

  checkboxLabelProducts(row?: ProductElement): string {
    if (!row) {
      return `${this.isAllSelectedProducts() ? 'select' : 'deselect'} all`;
    }
    return `${this.selectionProduct.isSelected(row) ? 'deselect' : 'select'} row ${row.product + 1}`;
  }
  
  checkboxLabelDurability(row?: DurabilityElement): string {
    if (!row) {
      return `${this.isAllSelectedProducts() ? 'select' : 'deselect'} all`;
    }
    return `${this.selectionDurability.isSelected(row) ? 'deselect' : 'select'} row ${row.productnumber + 1}`;
  }

  isAllSelectedDurability() {
    const numSelected = this.selectionDurability.selected.length;
    const numRows = this.dataSourceDurability.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggleDurability() {
    this.isAllSelected() ?
        this.selectionDurability.clear() :
        this.dataSourceDurability.data.forEach(row => this.selectionDurability.select(row));
  }

  toggleLoading() {
    this.message = "Calculating model. Please wait."
    this.loading = true;
      setTimeout(() => {
        this.runWasi2();
      });
  }

  //Saving result

  saveAsJSON() {
    const jsonfile = 
    new Blob([
             JSON.stringify(this.calculationResult)], 
             {type: "text/plain;charset=utf-8"});
             console.log("file", jsonfile);
             
      saveAs(jsonfile, "result.json");
  }

  //Preprocessing data

  wasmFilePath:any;
  echoStr:any;
  wasmFs:any;
  wasi: any;

  runWasi2() {
    if (typeof Worker !== 'undefined') {
      // Create a new
      const worker = new Worker(new URL('./app.worker'));
      worker.onmessage = ({ data }) => {
        console.log(`page got message: ${data}`);
      };
      worker.postMessage('hello');
    } else {
      // Web workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly
      console.log("NO worker");
      
    }
  }
  runWasi() {
    //this.toggleLoading();
    //console.log("WASI WASI");

    //console.log("Dura", this.dataSourceDurability.filteredData);
    
    // Parse files to Array
    console.log("cases", this.cases);
    
    this.helpExipiary = this.dataSourceDurability.filteredData;
    this.cases = this.dataSource.data;
    this.products = this.products.toArray();
    let casesaggregated = [];
    let alreadyremoved = [];
    this.cases.forEach((element, index) => {
      let count = 1;
      this.cases.forEach((element2, index2) => {
        if (element["dateofinfection"] == element2["dateofinfection"] && element["municipality"] == element2["municipality"] && index != index2 && !alreadyremoved.includes(index) && !alreadyremoved.includes(index2)) {
          count++;
          alreadyremoved.push(index2);
        }
      });
      casesaggregated.push({"zip": element["zip"], "pathogen": element["pathogen"], "municipality": element["municipality"], "dateofinfection": element["dateofinfection"], "count": count});
    });
    

    /*casesaggregated.forEach(element => {
      this.post.forEach(element2 => {
        if (element2["Kommunenavn"].toLowerCase().includes(element["municipality"].toLowerCase())) {
          element["zip"] = element2["Kommunenummer"];
        }
      });
    });*/
    console.log("Help", casesaggregated);

    casesaggregated.forEach(element => {
      this.postalcodes.forEach(element2 => {
        if (element2["GISCO_ID"].includes("NO_"+element["zip"])) {
          element["zip"] = element2["GISCO_ID"];
        }
      });
    });
    console.log("Help", casesaggregated);
    //this.products = this.dataSourceProduct.data;
    this.products.forEach(element => {
      element["deliverydate"] = date.transform(element["deliverydate"], "YYYYMMDD", 'YYYY-MM-DD');
    });
    console.log("Prod", this.products);

    casesaggregated.forEach(element => {
      element["dateofinfection"] = date.transform(element["dateofinfection"], "DD.MM.YYYY", 'YYYY-MM-DD');
    });
    //console.log("Cases", this.cases);

    this.calculateDistanceMatrix();

    let newpop = [];
    //console.log("pop", this.population);
    
    this.population.forEach(element => {
      if (element["country"] === this.country) {
        newpop.push(element);
      }
    });


    console.log(this.postalcodes, "Codes");

for (let i = 0; i < this.products.length; i++) {
  for (let j = 0; j < this.postalcodes.length; j++) {
    if (this.postalcodes[j]["PC_CNTR"].includes(this.products[i]["deliverypostcode"])) {
      this.products[i]["deliverypostcode"] = this.postalcodes[j]["GISCO_ID"];
      //this.products[i]["deliverypostcode"] = 1;
  }
  }

}
 
    console.log("product with lau", this.products);
    
    let populationdensity = [];
    newpop.forEach(e1 => {      
      this.distancematrix.forEach(e2 => {        
        if (e1["giscoid"].includes(e2["lau"])) {
          e2["populationdensity"] = Number.parseFloat(e1["population"])/(Number.parseInt(e2["area"])/1000000);
          populationdensity.push(e2);          
        }
      });
    });
    
    //console.log("Density", populationdensity);
    console.log("Arguments", casesaggregated, this.products, this.helpExipiary, populationdensity, this.incubationmax, this.incubationmin)
    let x = { casesaggregated: casesaggregated, 
              products: this.products,
              helpExipiary: this.helpExipiary,
              populationdensity: populationdensity,
              incubationmax: this.incubationmax,
              incubationmin: this.incubationmin};

              this.wasmFilePath = './worker.wasm'  // Path to our WASI module
              this.echoStr      = 'This assembly'    // Text string to echo
              this.wasmFs = new WasmFs()
              
              this.wasi = new WASI({
                // Arguments passed to the Wasm Module
                // The first argument is usually the filepath to the executable WASI module
                // we want to run.
                //args: [this.wasmFilePath, JSON.stringify(casesaggregated), JSON.stringify(this.products), JSON.stringify(this.helpExipiary), JSON.stringify(populationdensity), this.incubationmax, this.incubationmin],
                args: [this.wasmFilePath, this.echoStr],

                // Environment variables that are accesible to the WASI module
                env: {},
              
                // Bindings that are used by the WASI Instance (fs, path, etc...)
                bindings: {
                  ...WASI.defaultBindings,
                  fs: this.wasmFs.fs
                }
              })
          
              this.startWasiTask(this.wasmFilePath).then(x => {
                console.log("Result", x);
                
                //this.calculationResult = JSON.parse(JSON.parse(x));
                /*let resParsed = [];
                res.forEach(element => {
                  resParsed.push({productnumber:element["productnumber"], variant: element["variant"], name: element["name"]});
                });*/
                //this.dataSourceResult = new MatTableDataSource<ResultElement>(this.calculationResult);
                this.loading = false;
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
