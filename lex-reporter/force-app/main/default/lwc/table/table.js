import { LightningElement, api } from "lwc";

export default class Table extends LightningElement {
  @api selectedFields;
  @api childRecords;
  @api saved;
  @api topMostId;

  connectedCallback() {
    console.log(
      `table.js: connectedCallback: selectedFields: ${this.selectedFields}`
    );
    console.log(
      `table.js: connectedCallback: childRecords: ${this.childRecords}`
    );
    console.log(`table.js: connectedCallback: saved: ${this.saved}`);
    console.log(`table.js: connectedCallback: topMostId: ${this.topMostId}`);
  }

  @api getRows() {
    return this.template.querySelectorAll("c-table-row");
  }
}
