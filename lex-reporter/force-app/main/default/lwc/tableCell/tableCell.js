import { LightningElement, api, track } from "lwc";

export default class TableCell extends LightningElement {
  @track readOnly = true;
  @api cell;

  initEdit() {
    if (this.cell.IsEditable && this.cell.ReadOnly) {
      this.readOnly = false;
    }
  }

  listenForEscape(event) {
    if (event.keyCode === 27) {
      this.readOnly = true;
    }
  }

  handleValueChange(event) {
    this.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          Value: event.target.value,
          DataId: event.target.dataset.id
        }
      })
    );
  }
}
