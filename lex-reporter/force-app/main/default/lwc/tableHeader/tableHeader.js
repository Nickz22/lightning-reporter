import { LightningElement, api, track } from "lwc";

export default class TableHeader extends LightningElement {
  @api columns;
  @track sortedBy;
  @track sortedDirection = "asc";

  handleSort(event) {
    const fieldName = event.currentTarget.dataset.name;
    const sortDirection =
      fieldName === this.sortedBy && this.sortedDirection === "asc"
        ? "desc"
        : "asc";

    let newColumns = JSON.parse(JSON.stringify(this.columns));
    newColumns.forEach((column) => {
      if (column.name === fieldName) {
        column.isSorted = true;
        column.sortedIcon =
          sortDirection === "asc" ? "utility:arrowdown" : "utility:arrowup";
        column.sortedDirection = sortDirection;
      } else {
        column.isSorted = false;
      }
    });

    this.sortedBy = fieldName;
    this.sortedDirection = sortDirection;

    const sortEvent = new CustomEvent("sort", {
      detail: {
        fieldName: this.sortedBy,
        sortDirection: this.sortedDirection,
        columns: newColumns
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(sortEvent);
  }
}
