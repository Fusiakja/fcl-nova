/// <reference lib="webworker" />


import date from 'date-and-time';
import * as Turf from "@turf/turf";


addEventListener('message', ({ data }) => {

  console.log("Preprcessworker ");
  


  let casesaggregated = [];
  let alreadyremoved = [];
  data.cases.forEach((element, index) => {
    let count = 1;
    data.cases.forEach((element2, index2) => {
      if (element["dateofinfection"] == element2["dateofinfection"] && element["municipality"] == element2["municipality"] && index != index2 && !alreadyremoved.includes(index) && !alreadyremoved.includes(index2)) {
        count++;
        alreadyremoved.push(index2);
      }
    });
    casesaggregated.push({"zip": element["zip"], "pathogen": element["pathogen"], "municipality": element["municipality"], "dateofinfection": element["dateofinfection"], "count": count});
  });
  


  casesaggregated.forEach(element => {
    data.postalcodes.forEach(element2 => {
      if (element2["GISCO_ID"].includes("NO_"+element["zip"])) {
        element["zip"] = element2["GISCO_ID"];
      }
    });
  });
  data.products.forEach(element => {
    element["deliverydate"] = date.transform(element["deliverydate"], "YYYYMMDD", 'YYYY-MM-DD');
  });

  casesaggregated.forEach(element => {
    element["dateofinfection"] = date.transform(element["dateofinfection"], "DD.MM.YYYY", 'YYYY-MM-DD');
  });

  let centers = [];

    if (data.distancematrixmode == "centerofmass") {

      data.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes(data.country)) {
        let ob = {LAU: element["Value"]["properties"]["GISCO_ID"], center: Turf.centerOfMass(element["Value"]["geometry"]), area: Turf.area(element["Value"]["geometry"]) };
        centers.push(ob);
        }
      });
      
    } else {
      
      data.geojson.forEach(element => {
        if (element["Value"]["properties"]["GISCO_ID"].includes(data.country)) {
        let ob = {LAU: element["Value"]["properties"]["GISCO_ID"], center: Turf.centroid(element["Value"]["geometry"]), area: Turf.area(element["Value"]["geometry"]) };
        centers.push(ob);
        }
      });
      
    }

    let distancematrix = [];
    centers.forEach(e1 => {
      let distancematrixrow = [];
      centers.forEach(e2 => {
        let x = Turf.distance(e1["center"], e2["center"])
        distancematrixrow.push({lau: e2["LAU"], distance: x});
      });
      distancematrix.push({lau: e1["LAU"], area: e1["area"], distances: distancematrixrow});
    });


  let newpop = [];
  
  data.population.forEach(element => {
    if (element["country"] === data.country) {
      newpop.push(element);
    }
  });

for (let i = 0; i < data.products.length; i++) {
for (let j = 0; j < data.postalcodes.length; j++) {
  if (data.postalcodes[j]["PC_CNTR"].includes(data.products[i]["deliverypostcode"])) {
    data.products[i]["deliverypostcode"] = data.postalcodes[j]["GISCO_ID"];
}
}

}
  
  let populationdensity = [];
  newpop.forEach(e1 => {      
    distancematrix.forEach(e2 => {        
      if (e1["giscoid"].includes(e2["lau"])) {
        e2["populationdensity"] = Number.parseFloat(e1["population"])/(Number.parseInt(e2["area"])/1000000);
        populationdensity.push(e2);          
      }
    });
  });
  
  let response = {casesaggregated: casesaggregated,
                  products: data.products,
                  helpExipiary: data.helpExipiary,
                  populationdensity: populationdensity}

  postMessage(response);


});


