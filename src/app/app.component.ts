import { Component } from '@angular/core';
import { ApiService } from "./api.service";
import DataFrame from 'dataframe-js';
import date from 'date-and-time';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'nova';
  cases: any;
  products: any;
  geojson:any;
  helpExipiary: any;


  constructor(private api: ApiService){}


  file: any;
  handleFileInput() {
    console.log("GO");
    
    this.api.getLAU().subscribe(x => {
      this.geojson = x;
      console.log("LAU", x)
    })
  }

  handleCaseInput(e:any) {
    this.file = e.target.files[0];
    this.handleFileInput();
    DataFrame.fromJSON(this.file).then(df => {
    df.map(row => row.set('dateofinfection', row.get('dateofinfection')))
    this.cases = df;
    console.log("cases", this.cases);
    });

  }

  handleProductInput(e:any) {
    this.file = e.target.files[0];
    DataFrame.fromCSV(this.file).then(df => {
      this.products = df;
      console.log("products", this.products);
      });
  }

  handleHelpExpiaryInput(e:any) {
    this.file = e.target.files[0];
    DataFrame.fromCSV(this.file).then(df => {
      this.helpExipiary = df;
      console.log("help", this.helpExipiary);
      });
  }

  runWasi() {
    console.log("WASI WASI");

    let x = this.products.join(this.helpExipiary, ['productnumber', 'variant','Varenr', "Varenvariant"], 'inner');

    console.log("x", x);
    
    
  }
  
}
