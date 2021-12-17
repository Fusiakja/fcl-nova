import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import LAU_Population from "./../assets/nova-data/assets/LAU_Population.json";
import register_norway from "./../assets/nova-data/assets/register_norway.json";
import postal_no from "./../assets/nova-data/assets/postalcodes_no.json";

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
      return this.http.get("./../assets/nova-data/assets/LAU_Population.json");
    } catch (error) {
      alert(error)
    }
    
  }

  getCodes() {
    try {
      return this.http.get("./../assets/nova-data/assets/register_norway.json");
    } catch (error) {
      alert(error)
    }
  }


  getWorkers() {
    try {
      return this.http.get("./web-worker/app.worker.ts");
    }
    catch (error) {
      alert(error);
    };
  }

   getPostal(country:string) {
    console.log("Postal");
    
    try {
      return this.http.get('./../assets/nova-data/assets/postalcodes_' + country.toLowerCase() + '.json', this.httpOptions); 

    } catch (error) {
      alert(error)
    }
  }
}
