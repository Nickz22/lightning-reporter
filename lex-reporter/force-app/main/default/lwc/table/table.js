import { LightningElement, api } from "lwc";

export default class Table extends LightningElement {
  @api fields;
  @api records;
  @api saved;
  @api topMostId;

  connectedCallback() {
    console.log(`table.js: connectedCallback: fields: ${this.fields}`);
    console.log(`table.js: connectedCallback: records: ${this.records}`);
    console.log(`table.js: connectedCallback: saved: ${this.saved}`);
    console.log(`table.js: connectedCallback: topMostId: ${this.topMostId}`);
  }

  @api getRows() {
    return this.template.querySelectorAll("c-table-row");
  }
}
