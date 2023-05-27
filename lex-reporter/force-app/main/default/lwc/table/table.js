import { LightningElement, api } from "lwc";

export default class Table extends LightningElement {
  @api fields;
  @api records;
  @api saved;
  @api topMostId;

  // connectedcallback
  connectedCallback() {
    console.log("connectedCallback");
  }

  @api getRows() {
    return this.template.querySelectorAll("c-table-row");
  }
}
