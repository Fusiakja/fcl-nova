import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }



  getLAU()
  {

    console.log("GEO");
    
    try {

      return this.http.get('https://gisco-services.ec.europa.eu/distribution/v2/lau/geojson/LAU_RG_01M_2019_3857.geojson');
      
    } catch (error) {
      alert(error)
    }
  }

}
