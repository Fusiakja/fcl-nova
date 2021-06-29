import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {oboe} from "oboe";

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }
  
  private httpOptions = {
    headers: new HttpHeaders({
      Accept: 'plain/text'
    })
  };


  getLAU()
  {

    console.log("GEO");
    
    try {

      return this.http.get('https://gisco-services.ec.europa.eu/distribution/v2/lau/geojson/LAU_RG_01M_2019_4326.geojson');
      
    } catch (error) {
      alert(error)
    }
  }

  getPopulation() {

    console.log("POP");

    try {
      return this.http.get("./../assets/LAU_Population.json");
    } catch (error) {
      
    }
    
  }

  getCodes() {
    try {
      return this.http.get("./../assets/register_norway.json");
    } catch (error) {

    }
  }

  getPostal(country:string) {
    console.log("Postal");
    
    try {
      
      return this.http.get('./../assets/postalcodes_' + country.toLowerCase() + '.json', this.httpOptions);

    } catch (error) {
      alert(error)
    }
  }
}
