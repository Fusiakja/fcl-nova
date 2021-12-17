import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class HeaderComponent implements OnInit {

  appName = "FoodChain-Lab | NOVA";
  constructor() { }

  ngOnInit(): void {
  }

}
